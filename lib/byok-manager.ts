import crypto from 'crypto';
import { BYOKConfig, APIKeyValidation } from './byok';
import { prisma } from '@/lib/prisma';

export class BYOKManager {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  constructor(private encryptionKey: string) {}

  /**
   * Encrypt API key for secure storage
   */
  encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(BYOKManager.IV_LENGTH);
    const cipher = crypto.createCipher(BYOKManager.ALGORITHM, this.encryptionKey);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt API key for use
   */
  decryptApiKey(encryptedApiKey: string): string {
    const parts = encryptedApiKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted API key format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(BYOKManager.ALGORITHM, this.encryptionKey);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Validate OpenRouter API key
   */
  async validateApiKey(apiKey: string): Promise<APIKeyValidation> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'AiAppsy WebStudio',
        },
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      // Extract rate limit info if available
      const rateLimit = {
        requests: parseInt(response.headers.get('x-ratelimit-limit-requests') || '100'),
        tokens: parseInt(response.headers.get('x-ratelimit-limit-tokens') || '10000'),
        window: response.headers.get('x-ratelimit-window') || '1d',
      };

      return {
        isValid: true,
        model: 'openrouter',
        rateLimit,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user's BYOK configuration
   */
  async getUserBYOK(userId: string, workspaceId: string): Promise<BYOKConfig | null> {
    try {
      // This would typically fetch from your database
      const result = await prisma.bYOKConfig.findFirst({
        where: {
          userId,
          workspaceId,
        },
      });

      if (!result) return null;

      // Decrypt the API key
      const decryptedKey = this.decryptApiKey(result.encryptedApiKey);

      return {
        ...result,
        openrouterApiKey: decryptedKey,
      };
    } catch (error) {
      console.error('Error fetching BYOK config:', error);
      return null;
    }
  }

  /**
   * Save or update user's BYOK configuration
   */
  async saveUserBYOK(userId: string, workspaceId: string, config: Partial<BYOKConfig>): Promise<BYOKConfig> {
    try {
      // Validate the API key first
      if (config.openrouterApiKey) {
        const validation = await this.validateApiKey(config.openrouterApiKey);
        if (!validation.isValid) {
          throw new Error(`Invalid API key: ${validation.error}`);
        }
      }

      // Encrypt the API key
      const encryptedApiKey = config.openrouterApiKey 
        ? this.encryptApiKey(config.openrouterApiKey)
        : undefined;

      // Save to database
      const result = await prisma.bYOKConfig.upsert({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
        update: {
          encryptedApiKey,
          keyName: config.keyName,
          keyDescription: config.keyDescription,
          monthlyTokenLimit: config.monthlyTokenLimit || 50000,
          costLimit: config.costLimit || 50,
          preferredModel: config.preferredModel || 'anthropic/claude-3.5-sonnet',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 4000,
          enableStreaming: config.enableStreaming ?? true,
          enableOptimization: config.enableOptimization ?? true,
          enableCaching: config.enableCaching ?? true,
          customSystemPrompt: config.customSystemPrompt,
          responseFormat: config.responseFormat || 'markdown',
          allowedDomains: config.allowedDomains || [],
          ipWhitelist: config.ipWhitelist || [],
          updatedAt: new Date(),
        },
        create: {
          userId,
          workspaceId,
          encryptedApiKey: encryptedApiKey!,
          keyName: config.keyName || 'Default API Key',
          keyDescription: config.keyDescription,
          monthlyTokenLimit: config.monthlyTokenLimit || 50000,
          costLimit: config.costLimit || 50,
          preferredModel: config.preferredModel || 'anthropic/claude-3.5-sonnet',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 4000,
          enableStreaming: config.enableStreaming ?? true,
          enableOptimization: config.enableOptimization ?? true,
          enableCaching: config.enableCaching ?? true,
          customSystemPrompt: config.customSystemPrompt,
          responseFormat: config.responseFormat || 'markdown',
          allowedDomains: config.allowedDomains || [],
          ipWhitelist: config.ipWhitelist || [],
        },
      });

      // Return the config with decrypted key
      return {
        ...result,
        openrouterApiKey: config.openrouterApiKey!,
      };
    } catch (error) {
      console.error('Error saving BYOK config:', error);
      throw error;
    }
  }

  /**
   * Check usage limits
   */
  async checkUsageLimits(userId: string, workspaceId: string, tokensRequested: number): Promise<{
    allowed: boolean;
    remainingTokens: number;
    remainingCost: number;
    error?: string;
  }> {
    try {
      const config = await this.getUserBYOK(userId, workspaceId);
      if (!config) {
        return {
          allowed: false,
          remainingTokens: 0,
          remainingCost: 0,
          error: 'No BYOK configuration found',
        };
      }

      // Get current usage for the month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const usage = await prisma.usageTracking.findMany({
        where: {
          userId,
          workspaceId,
          timestamp: {
            gte: currentMonth,
          },
        },
      });

      const totalTokensUsed = usage.reduce((sum, u) => sum + u.tokensUsed, 0);
      const totalCost = usage.reduce((sum, u) => sum + u.cost, 0);

      const remainingTokens = config.monthlyTokenLimit - totalTokensUsed;
      const remainingCost = config.costLimit - totalCost;

      // Estimate cost for requested tokens (rough calculation)
      const estimatedCost = (tokensRequested / 1000) * 0.001; // $0.001 per 1K tokens

      const allowed = 
        remainingTokens >= tokensRequested && 
        remainingCost >= estimatedCost;

      return {
        allowed,
        remainingTokens,
        remainingCost,
        error: allowed ? undefined : 'Usage limit exceeded',
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      return {
        allowed: false,
        remainingTokens: 0,
        remainingCost: 0,
        error: 'Failed to check usage limits',
      };
    }
  }

  /**
   * Track API usage
   */
  async trackUsage(usage: {
    userId: string;
    workspaceId: string;
    tokensUsed: number;
    cost: number;
    model: string;
    requestType: 'generation' | 'editing' | 'deployment' | 'export';
    success: boolean;
    errorMessage?: string;
    responseTime: number;
  }): Promise<void> {
    try {
      await prisma.usageTracking.create({
        data: {
          ...usage,
          timestamp: new Date(),
        },
      });

      // Update last used timestamp
      await prisma.bYOKConfig.updateMany({
        where: {
          userId: usage.userId,
          workspaceId: usage.workspaceId,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Don't throw here - tracking failures shouldn't break the main flow
    }
  }
}

// Singleton instance
export const byokManager = new BYOKManager(process.env.ENCRYPTION_KEY!);