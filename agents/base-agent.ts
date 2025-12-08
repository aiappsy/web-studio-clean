// agents/base-agent.ts

export type AgentKind =
  | "website-architect"
  | "content-writer"
  | "layout-designer";

export interface BaseAgentConfig {
  /**
   * LLM model id, e.g.
   * - "deepseek/deepseek-r1:free"
   * - "gpt-4.1-mini"
   */
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  /**
   * Optional system prompt override.
   * If omitted, each agent will provide its own default.
   */
  systemPrompt?: string;
}

export interface AgentRunOptions {
  input: string;
  context?: Record<string, any>;
  /**
   * Token-level streaming callback.
   * If provided, the agent will request a streaming response
   * and call this for each token/chunk.
   */
  onToken?: (chunk: AgentStreamChunk) => void;
  signal?: AbortSignal;
}

export interface AgentStreamChunk {
  token: string;
  fullText: string;
}

export interface AgentResult {
  /**
   * The final, concatenated model output.
   */
  text: string;
  /**
   * Optional structured payload each agent may attach.
   * (e.g. JSON layout, section structure, etc.)
   */
  data?: any;
}

export abstract class BaseAgent {
  readonly id: string;
  readonly kind: AgentKind;
  readonly name: string;
  readonly description: string;

  protected config: BaseAgentConfig;

  constructor(
    id: string,
    kind: AgentKind,
    name: string,
    description: string,
    config: BaseAgentConfig
  ) {
    this.id = id;
    this.kind = kind;
    this.name = name;
    this.description = description;
    this.config = {
      temperature: 0.2,
      maxTokens: 2048,
      stream: true,
      ...config,
    };
  }

  /** Override to customize the system prompt per agent. */
  protected abstract getDefaultSystemPrompt(): string;

  /**
   * Override to build the user prompt from raw input + context.
   * Context may include things like:
   * - businessDetails
   * - targetAudience
   * - previousAgentOutput
   */
  protected abstract buildUserPrompt(
    input: string,
    context?: Record<string, any>
  ): string;

  /**
   * Main entrypoint for running the agent.
   * Handles streaming + non-streaming, returns final text + optional data.
   */
  async run(options: AgentRunOptions): Promise<AgentResult> {
    const { input, context, onToken, signal } = options;

    const systemPrompt =
      this.config.systemPrompt ?? this.getDefaultSystemPrompt();
    const userPrompt = this.buildUserPrompt(input, context);

    const apiKey =
      process.env.OPENROUTER_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.OPENAI_API_KEY_WEBSTUDIO; // fallback in case you added a custom one

    if (!apiKey) {
      throw new Error(
        `[${this.name}] Missing OPENROUTER_API_KEY or OPENAI_API_KEY in environment.`
      );
    }

    const model =
      this.config.model ||
      process.env.OPENROUTER_DEFAULT_MODEL ||
      "deepseek/deepseek-r1:free";

    const useStreaming = Boolean(onToken ?? this.config.stream);

    const body = {
      model,
      stream: useStreaming,
      temperature: this.config.temperature ?? 0.2,
      max_tokens: this.config.maxTokens ?? 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    // OpenRouter-friendly metadata (safe no-ops for plain OpenAI)
    if (process.env.OPENROUTER_SITE_URL) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    }
    if (process.env.OPENROUTER_APP_NAME) {
      headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `[${this.name}] LLM request failed (${response.status}): ${text}`
      );
    }

    if (useStreaming) {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(`[${this.name}] Streaming not supported in this env.`);
      }

      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split("\n");

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;

          const payload = line.slice("data:".length).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const json = JSON.parse(payload);
            const delta =
              json.choices?.[0]?.delta?.content ??
              json.choices?.[0]?.message?.content ??
              "";

            if (typeof delta === "string" && delta.length > 0) {
              fullText += delta;
              if (onToken) {
                onToken({ token: delta, fullText });
              }
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      return { text: fullText };
    } else {
      const json = await response.json();
      const content =
        json.choices?.[0]?.message?.content ??
        json.choices?.[0]?.delta?.content ??
        "";
      return { text: typeof content === "string" ? content : "" };
    }
  }
}
