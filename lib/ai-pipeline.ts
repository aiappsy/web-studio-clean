import { z } from 'zod';
import { byokManager } from '@/lib/byok-manager';
import { db } from '@/lib/db';

// Base Agent Schema
export const BaseAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['architect', 'content', 'layout', 'export', 'deployment']),
  status: z.enum(['idle', 'running', 'completed', 'failed']).default('idle'),
  
  // Agent configuration
  model: z.string().default('anthropic/claude-3.5-sonnet'),
  temperature: z.number().default(0.7),
  maxTokens: z.number().default(4000),
  
  // Input/Output schemas
  inputSchema: z.any(),
  outputSchema: z.any(),
  
  // Memory and context
  memory: z.record(z.any()).default({}),
  context: z.record(z.any()).default({}),
  
  // Execution tracking
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  
  // Error handling
  error: z.string().optional(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
});

export type BaseAgent = z.infer<typeof BaseAgentSchema>;

// Pipeline Execution Schema
export const PipelineExecutionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  projectId: z.string,
  
  // Pipeline configuration
  agents: z.array(BaseAgentSchema),
  currentStep: z.number().default(0),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).default('pending'),
  
  // Input data
  input: z.record(z.any()),
  
  // Output data
  output: z.record(z.any()).default({}),
  
  // Progress tracking
  progress: z.number().default(0),
  logs: z.array(z.object({
    timestamp: z.date(),
    agent: z.string(),
    message: z.string(),
    type: z.enum(['info', 'warning', 'error', 'success']),
  })).default([]),
  
  // Token usage
  tokensUsed: z.number().default(0),
  estimatedCost: z.number().default(0),
  
  // Timestamps
  createdAt: z.date().default(() => new Date()),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export type PipelineExecution = z.infer<typeof PipelineExecutionSchema>;

// Agent Response Schema
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional(),
  tokensUsed: z.number(),
  cost: z.number(),
  duration: z.number(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Abstract Base Agent Class
export abstract class BaseAgentClass {
  protected config: BaseAgent;
  protected userId: string;
  protected workspaceId: string;
  protected byokConfig: any;

  constructor(config: BaseAgent, userId: string, workspaceId: string) {
    this.config = config;
    this.userId = userId;
    this.workspaceId = workspaceId;
  }

  abstract execute(input: any): Promise<AgentResponse>;

  protected async callAI(prompt: string, schema?: any): Promise<any> {
    // Get BYOK config
    this.byokConfig = await byokManager.getUserBYOK(this.userId, this.workspaceId);
    if (!this.byokConfig) {
      throw new Error('No BYOK configuration found');
    }

    // Check usage limits
    const usageCheck = await byokManager.checkUsageLimits(
      this.userId, 
      this.workspaceId, 
      this.config.maxTokens
    );
    
    if (!usageCheck.allowed) {
      throw new Error(usageCheck.error || 'Usage limit exceeded');
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.byokConfig.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://aiappsy.com',
          'X-Title': 'AiAppsy WebStudio',
        },
        body: JSON.stringify({
          model: this.byokConfig.preferredModel || this.config.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.byokConfig.temperature || this.config.temperature,
          max_tokens: this.byokConfig.maxTokens || this.config.maxTokens,
          response_format: schema ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from AI');
      }

      let parsedContent = content;
      if (schema) {
        try {
          parsedContent = JSON.parse(content);
        } catch (error) {
          throw new Error('Invalid JSON response from AI');
        }
      }

      const tokensUsed = data.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokensUsed, this.byokConfig.preferredModel);
      const duration = Date.now() - startTime;

      // Track usage
      await byokManager.trackUsage({
        userId: this.userId,
        workspaceId: this.workspaceId,
        tokensUsed,
        cost,
        model: this.byokConfig.preferredModel,
        requestType: 'generation',
        success: true,
        responseTime: duration,
      });

      return {
        content: parsedContent,
        tokensUsed,
        cost,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed usage
      await byokManager.trackUsage({
        userId: this.userId,
        workspaceId: this.workspaceId,
        tokensUsed: 0,
        cost: 0,
        model: this.byokConfig.preferredModel,
        requestType: 'generation',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseTime: duration,
      });

      throw error;
    }
  }

  protected abstract getSystemPrompt(): string;

  protected calculateCost(tokens: number, model: string): number {
    // Rough cost calculation - update with actual OpenRouter pricing
    const costPer1KTokens: Record<string, number> = {
      'anthropic/claude-3.5-sonnet': 0.003,
      'anthropic/claude-3-opus': 0.015,
      'openai/gpt-4': 0.01,
      'openai/gpt-4-turbo': 0.01,
      'openai/gpt-3.5-turbo': 0.001,
      'google/gemini-pro': 0.0005,
    };

    const rate = costPer1KTokens[model] || 0.003;
    return (tokens / 1000) * rate;
  }

  protected addLog(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    this.config.memory.logs = this.config.memory.logs || [];
    this.config.memory.logs.push({
      timestamp: new Date(),
      agent: this.config.name,
      message,
      type,
    });
  }

  protected updateMemory(key: string, value: any): void {
    this.config.memory[key] = value;
  }

  protected getMemory(key?: string): any {
    return key ? this.config.memory[key] : this.config.memory;
  }
}

// Pipeline Runner
export class PipelineRunner {
  private execution: PipelineExecution;
  private agents: Map<string, BaseAgentClass> = new Map();

  constructor(execution: PipelineExecution) {
    this.execution = execution;
  }

  async run(): Promise<PipelineExecution> {
    this.execution.status = 'running';
    this.execution.startedAt = new Date();

    try {
      for (let i = 0; i < this.execution.agents.length; i++) {
        this.execution.currentStep = i;
        this.execution.progress = (i / this.execution.agents.length) * 100;

        const agent = this.execution.agents[i];
        agent.status = 'running';
        agent.startTime = new Date();

        this.addLog(`Starting agent: ${agent.name}`, 'info');

        try {
          const agentInstance = this.getAgentInstance(agent);
          const input = this.prepareAgentInput(agent, i);
          const response = await agentInstance.execute(input);

          if (response.success) {
            agent.status = 'completed';
            agent.endTime = new Date();
            agent.duration = response.duration;
            
            this.execution.output[agent.id] = response.data;
            this.execution.tokensUsed += response.tokensUsed;
            this.execution.estimatedCost += response.cost;

            this.addLog(
              `Agent ${agent.name} completed successfully. Tokens: ${response.tokensUsed}, Cost: $${response.cost.toFixed(4)}`,
              'success'
            );
          } else {
            throw new Error(response.error || 'Agent failed');
          }
        } catch (error) {
          agent.status = 'failed';
          agent.error = error instanceof Error ? error.message : 'Unknown error';
          agent.endTime = new Date();

          this.addLog(
            `Agent ${agent.name} failed: ${agent.error}`,
            'error'
          );

          // Retry logic
          if (agent.retryCount < agent.maxRetries) {
            agent.retryCount++;
            agent.status = 'idle';
            i--; // Retry this agent
            this.addLog(`Retrying agent ${agent.name} (attempt ${agent.retryCount})`, 'warning');
            await new Promise(resolve => setTimeout(resolve, 1000 * agent.retryCount));
            continue;
          } else {
            throw error;
          }
        }
      }

      this.execution.status = 'completed';
      this.execution.completedAt = new Date();
      this.execution.progress = 100;

      this.addLog('Pipeline completed successfully', 'success');
    } catch (error) {
      this.execution.status = 'failed';
      this.execution.completedAt = new Date();
      this.addLog(`Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }

    return this.execution;
  }

  private getAgentInstance(agent: BaseAgent): BaseAgentClass {
    // This would return the appropriate agent instance based on type
    // For now, return a placeholder
    throw new Error('Agent instance not implemented');
  }

  private prepareAgentInput(agent: BaseAgent, stepIndex: number): any {
    // Prepare input for the agent based on previous steps
    const input = {
      ...this.execution.input,
      ...this.execution.output,
      step: stepIndex,
      totalSteps: this.execution.agents.length,
      memory: agent.memory,
      context: agent.context,
    };

    return input;
  }

  private addLog(message: string, type: 'info' | 'warning' | 'error' | 'success'): void {
    this.execution.logs.push({
      timestamp: new Date(),
      agent: 'Pipeline',
      message,
      type,
    });
  }

  cancel(): void {
    if (this.execution.status === 'running') {
      this.execution.status = 'cancelled';
      this.execution.completedAt = new Date();
      this.addLog('Pipeline cancelled by user', 'warning');
    }
  }
}