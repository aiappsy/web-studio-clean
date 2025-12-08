// agents/content-writer.ts

import { BaseAgent } from "./base-agent";
import type { WebsiteArchitecture } from "./website-architect";

export interface ContentWriterOptions {
  tone?:
    | "professional"
    | "friendly"
    | "playful"
    | "luxury"
    | "minimal"
    | "technical";
  language?: string;
}

export class ContentWriterAgent extends BaseAgent {
  constructor(config?: Partial<ConstructorParameters<typeof BaseAgent>[4]>) {
    super(
      "content-writer",
      "content-writer",
      "Content Writer",
      "Writes full website copy (headlines + body text) based on the architecture.",
      {
        model:
          config?.model ||
          process.env.WEBSTUDIO_CONTENT_MODEL ||
          "deepseek/deepseek-r1:free",
        temperature: config?.temperature ?? 0.5,
        maxTokens: config?.maxTokens ?? 3500,
        stream: config?.stream ?? true,
        systemPrompt: config?.systemPrompt,
      }
    );
  }

  protected getDefaultSystemPrompt(): string {
    return [
      "You are the Content Writer for AiAppsy Web Studio.",
      "You receive a website architecture JSON and must write clear, persuasive copy.",
      "",
      "Output a JSON object mirroring the page + section structure, with fields:",
      "",
      "{",
      '  "pages": [',
      "    {",
      '      "id": string,',
      '      "title": string,',
      '      "sections": [',
      "        {",
      '          "id": string,',
      '          "title": string,',
      '          "headline": string,',
      '          "subheadline"?: string,',
      '          "body": string,',
      '          "bullets"?: string[]',
      "        }",
      "      ]",
      "    }",
      "  ]",
      "}",
      "",
      "Guidelines:",
      "- Reuse and elevate user language; do NOT sound generic.",
      "- Headlines must be punchy and benefit-driven.",
      "- Body copy should be concise, scannable, and conversion-focused.",
      "- Respect the requested tone and language when provided.",
    ].join("\n");
  }

  protected buildUserPrompt(
    input: string,
    context?: Record<string, any>
  ): string {
    const arch = context?.architecture as WebsiteArchitecture | undefined;
    const writerOptions = context?.writerOptions as
      | ContentWriterOptions
      | undefined;

    const tone = writerOptions?.tone ?? "professional";
    const language = writerOptions?.language ?? "English";

    const archJson = arch ? JSON.stringify(arch, null, 2) : input.trim();

    return [
      `Language: ${language}`,
      `Tone: ${tone}`,
      "",
      "Website architecture JSON:",
      archJson,
      "",
      "Write complete website copy for each page and section using the format described in the system prompt.",
    ].join("\n");
  }
}
