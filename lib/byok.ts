import { z } from 'zod';

// BYOK - Bring Your Own Key Schema for OpenRouter
export const BYOKSchema = z.object({
  // User's OpenRouter API Key (encrypted at rest)
  openrouterApiKey: z.string().min(1, 'OpenRouter API key is required'),
  
  // Key metadata
  keyName: z.string().optional(),
  keyDescription: z.string().optional(),
  
  // Usage limits and quotas
  monthlyTokenLimit: z.number().min(1000).default(50000),
  costLimit: z.number().min(1).default(50), // USD
  
  // Preferences
  preferredModel: z.string().default('anthropic/claude-3.5-sonnet'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(8000).default(4000),
  
  // Feature flags
  enableStreaming: z.boolean().default(true),
  enableOptimization: z.boolean().default(true),
  enableCaching: z.boolean().default(true),
  
  // Advanced settings
  customSystemPrompt: z.string().optional(),
  responseFormat: z.enum(['text', 'json', 'markdown']).default('markdown'),
  
  // Security settings
  allowedDomains: z.array(z.string()).default([]),
  ipWhitelist: z.array(z.string()).default([]),
  
  // Timestamps
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  lastUsedAt: z.date().optional(),
});

export type BYOKConfig = z.infer<typeof BYOKSchema>;

// Usage tracking schema
export const UsageTrackingSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
  tokensUsed: z.number(),
  cost: z.number(),
  model: z.string(),
  requestType: z.enum(['generation', 'editing', 'deployment', 'export']),
  timestamp: z.date().default(() => new Date()),
  success: z.boolean(),
  errorMessage: z.string().optional(),
  responseTime: z.number(),
});

export type UsageTracking = z.infer<typeof UsageTrackingSchema>;

// API Key validation schema
export const APIKeyValidationSchema = z.object({
  isValid: z.boolean(),
  model: z.string().optional(),
  balance: z.number().optional(),
  rateLimit: z.object({
    requests: z.number(),
    tokens: z.number(),
    window: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type APIKeyValidation = z.infer<typeof APIKeyValidationSchema>;