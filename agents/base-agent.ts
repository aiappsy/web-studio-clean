import {
  OpenRouterMessage,
  OpenRouterOptions,
  openRouterClient,
} from "@/lib/openrouter";
import { withTimeout, withRetry } from "@/lib/errors";
import Telemetry from "@/lib/telemetry";

export interface AgentContext {
  userId?: string;
  projectId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: number;
  model: string;
  agent: string;
  executionId: string;
}

export interface AgentDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  onPreProcess?: (input: any, context?: AgentContext) => any;
  onPostProcess?: (output: any, context?: AgentContext) => any;
  validateInput?: (input: any) => boolean;
  validateOutput?: (output: any) => boolean;
}

export abstract class BaseAgent {
  protected definition: AgentDefinition;
  protected context?: AgentContext;

  constructor(definition: AgentDefinition) {
    this.definition = definition;
  }

  setContext(context: AgentContext): void {
    this.context = context;
  }

  protected async executeWithOpenRouter(
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {},
    onChunk?: (chunk: string) => void
  ): Promise<any> {
    const executionId = this.context?.sessionId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Pre-processing step
      let processedMessages = messages;
      if (this.definition.onPreProcess) {
        processedMessages = this.definition.onPreProcess(
          messages,
          this.context
        );
      }

      // Execute with timeout + retry handling
      const completion = await withTimeout(
        withRetry(async () => {
          if (onChunk) {
            return await openRouterClient.createStreamingCompletion(
              processedMessages,
              {
                model: this.definition.defaultModel,
                temperature: this.definition.temperature,
                max_tokens: this.definition.maxTokens,
                ...options,
              },
              onChunk
            );
          }

          return await openRouterClient.createChatCompletion(
            processedMessages,
            {
              model: this.definition.defaultModel,
              temperature: this.definition.temperature,
              max_tokens: this.definition.maxTokens,
              ...options,
            }
          );
        }),
        30000
      );

      // Post-processing
      let result = completion.choices?.[0]?.message?.content;
      if (this.definition.onPostProcess) {
        result = this.definition.onPostProcess(result, this.context);
      }

      // Output validation
      if (
        this.definition.validateOutput &&
        !this.definition.validateOutput(result)
      ) {
        throw new Error("Agent output validation failed");
      }

      // Compute performance metrics
      const latency = Date.now() - startTime;
      const tokenUsage = completion.usage
        ? {
            prompt: completion.usage.prompt_tokens || 0,
            completion: completion.usage.completion_tokens || 0,
            total: completion.usage.total_tokens || 0,
          }
        : { prompt: 0, completion: 0, total: 0 };

      // Telemetry logging (success)
      Telemetry.logAIExecution({
        agentName: this.definition.name,
        modelName: completion.model,
        inputTokens: tokenUsage.prompt,
        outputTokens: tokenUsage.completion,
        totalTokens: tokenUsage.total,
        latency,
        success: true,
        userId: this.context?.userId,
        projectId: this.context?.projectId,
        metadata: { executionId, ...this.context?.metadata },
      });

      return {
        success: true,
        data: result,
        tokenUsage,
        latency,
        model: completion.model,
        agent: this.definition.name,
        executionId,
      };
    } catch (err) {
      const latency = Date.now() - startTime;

      Telemetry.logAIExecution({
        agentName: this.definition.name,
        modelName: this.definition.defaultModel || "unknown",
        latency,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        userId: this.context?.userId,
        projectId: this.context?.projectId,
        metadata: { executionId, ...this.context?.metadata },
      });

      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        latency,
        model: this.definition.defaultModel || "unknown",
        agent: this.definition.name,
        executionId,
      };
    }
  }

  abstract execute(
    input: any,
    options?: OpenRouterOptions
  ): Promise<AgentResult>;
}

// ⭐ REQUIRED EXPORT TO FIX YOUR DEPLOYMENT
export type { OpenRouterMessage };
