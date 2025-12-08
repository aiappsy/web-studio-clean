import {
  OpenRouterMessage,
  OpenRouterOptions,
  openRouterClient,
} from "@/lib/openrouter";
import { withRetry, withTimeout } from "@/lib/errors";
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
      let processed = messages;
      if (this.definition.onPreProcess) {
        processed = this.definition.onPreProcess(messages, this.context);
      }

      const completion = await withTimeout(
        withRetry(async () => {
          if (onChunk) {
            return openRouterClient.createStreamingCompletion(
              processed,
              {
                model: this.definition.defaultModel,
                temperature: this.definition.temperature,
                max_tokens: this.definition.maxTokens,
                ...options,
              },
              onChunk
            );
          }

          return openRouterClient.createChatCompletion(processed, {
            model: this.definition.defaultModel,
            temperature: this.definition.temperature,
            max_tokens: this.definition.maxTokens,
            ...options,
          });
        }),
        30000
      );

      let result = completion.choices?.[0]?.message?.content || "";

      if (this.definition.onPostProcess) {
        result = this.definition.onPostProcess(result, this.context);
      }

      const latency = Date.now() - startTime;
      const usage = completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      Telemetry.track("agent_execution", {
        agentName: this.definition.name,
        latency,
        tokens: usage,
      });

      return {
        success: true,
        data: result,
        tokenUsage: {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens,
        },
        latency,
        model: completion.model,
        agent: this.definition.name,
        executionId,
      };
    } catch (err) {
      const latency = Date.now() - startTime;

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

  abstract execute(input: any, options?: OpenRouterOptions): Promise<AgentResult>;
}

export type {
  OpenRouterMessage,
  OpenRouterOptions,
};
