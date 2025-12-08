// agents/runner.ts

import { BaseAgent } from "./base-agent";
import { WebsiteArchitectAgent } from "./website-architect";
import { ContentWriterAgent } from "./content-writer";
import { LayoutDesignerAgent } from "./layout-designer";

export interface AgentRunnerConfig {
  /**
   * Default model for all agents when not overridden.
   */
  model?: string;
  temperature?: number;
  stream?: boolean;
}

export interface ExecutionContext {
  /**
   * Raw user input (business description, goals, etc.).
   */
  brief: string;
  /**
   * Shared bag for passing data between stages.
   */
  data: Record<string, any>;
}

export interface ExecutionResult {
  context: ExecutionContext;
}

export type PipelineStageId =
  | "architecture"
  | "content"
  | "layout";

export interface PipelineStage {
  id: PipelineStageId;
}

export type TokenCallback = (payload: {
  stage: PipelineStageId;
  token: string;
  fullText: string;
}) => void;

export class AgentRunner {
  private readonly architect: WebsiteArchitectAgent;
  private readonly writer: ContentWriterAgent;
  private readonly designer: LayoutDesignerAgent;

  constructor(config?: AgentRunnerConfig) {
    const baseModel =
      config?.model ||
      process.env.WEBSTUDIO_DEFAULT_MODEL ||
      "deepseek/deepseek-r1:free";

    this.architect = new WebsiteArchitectAgent({
      model: baseModel,
      temperature: config?.temperature,
      stream: config?.stream,
    });

    this.writer = new ContentWriterAgent({
      model: baseModel,
      temperature: config?.temperature,
      stream: config?.stream,
    });

    this.designer = new LayoutDesignerAgent({
      model: baseModel,
      temperature: config?.temperature,
      stream: config?.stream,
    });
  }

  /**
   * Run the full pipeline: architecture → content → layout.
   */
  async runFullPipeline(options: {
    brief: string;
    onToken?: TokenCallback;
    signal?: AbortSignal;
  }): Promise<ExecutionResult> {
    const { brief, onToken, signal } = options;

    const context: ExecutionContext = {
      brief,
      data: {},
    };

    // 1) Architecture
    const archRes = await this.architect.runAndParse({
      input: brief,
      context: {},
      signal,
      onToken: onToken
        ? ({ token, fullText }) =>
            onToken({ stage: "architecture", token, fullText })
        : undefined,
    });

    context.data.architectureText = archRes.text;
    if (archRes.architecture) {
      context.data.architecture = archRes.architecture;
    }

    // 2) Content
    const contentRes = await this.writer.run({
      input: brief,
      context: {
        architecture: context.data.architecture,
        writerOptions: {
          tone: "professional",
          language: "English",
        },
      },
      signal,
      onToken: onToken
        ? ({ token, fullText }) =>
            onToken({ stage: "content", token, fullText })
        : undefined,
    });

    context.data.copyText = contentRes.text;

    // 3) Layout
    const layoutRes = await this.designer.run({
      input: brief,
      context: {
        architecture: context.data.architecture,
        copyJson: contentRes.text,
      },
      signal,
      onToken: onToken
        ? ({ token, fullText }) =>
            onToken({ stage: "layout", token, fullText })
        : undefined,
    });

    context.data.layoutText = layoutRes.text;

    return { context };
  }

  /**
   * Expose individual agents for ad-hoc use if needed.
   */
  getAgents() {
    return {
      architect: this.architect,
      writer: this.writer,
      designer: this.designer,
    };
  }
}
