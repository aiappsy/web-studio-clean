// agents/website-architect.ts

import { BaseAgent } from "./base-agent";

export interface WebsiteArchitecture {
  siteType: "one-page" | "multi-page";
  pages: Array<{
    id: string;
    slug: string;
    title: string;
    purpose: string;
    sections: Array<{
      id: string;
      title: string;
      goal: string;
      hints?: string[];
    }>;
  }>;
  notes?: string;
}

export class WebsiteArchitectAgent extends BaseAgent {
  constructor(config?: Partial<ConstructorParameters<typeof BaseAgent>[4]>) {
    super(
      "website-architect",
      "website-architect",
      "Website Architect",
      "Turns business descriptions into a clean website structure (pages + sections).",
      {
        model:
          config?.model ||
          process.env.WEBSTUDIO_ARCHITECT_MODEL ||
          "deepseek/deepseek-r1:free",
        temperature: config?.temperature ?? 0.25,
        maxTokens: config?.maxTokens ?? 2400,
        stream: config?.stream ?? true,
        systemPrompt: config?.systemPrompt,
      }
    );
  }

  protected getDefaultSystemPrompt(): string {
    return [
      "You are the Website Architect for AiAppsy Web Studio.",
      "Your job is to design a clear, production-ready website structure from a natural-language brief.",
      "",
      "Output a JSON object with this shape:",
      "",
      "{",
      '  "siteType": "one-page" | "multi-page",',
      '  "pages": [',
      "    {",
      '      "id": "home",',
      '      "slug": "home",',
      '      "title": "Home",',
      '      "purpose": "High-level hook and overview",',
      '      "sections": [',
      "        {",
      '          "id": "hero",',
      '          "title": "Hero Section",',
      '          "goal": "Hook visitor and explain value quickly",',
      '          "hints": [',
      '            "1–2 sentences hook",',
      '            "Primary CTA",',
      '            "Key trust indicators"',
      "          ]",
      "        }",
      "      ]",
      "    }",
      "  ],",
      '  "notes": "any extra implementation notes for designers & developers"',
      "}",
      "",
      "Important:",
      "- Be concise but specific.",
      "- Prefer 3–7 core sections per page.",
      "- Use lowercase, URL-safe slugs.",
      "- IDs must be stable and human-readable (no random UUIDs).",
    ].join("\n");
  }

  protected buildUserPrompt(
    input: string,
    context?: Record<string, any>
  ): string {
    const extra = context?.extraInstructions
      ? `\n\nAdditional constraints:\n${context.extraInstructions}`
      : "";

    return [
      "Business / project description:",
      input.trim(),
      "",
      "If the user said they want a one-page or multi-page site, respect that.",
      "Otherwise, decide what makes most sense and explain briefly in notes.",
      extra,
    ].join("\n");
  }

  /**
   * Convenience helper: run and parse JSON.
   * If JSON parsing fails, we still return the raw text in `text`.
   */
  async runAndParse(options: {
    input: string;
    context?: Record<string, any>;
    signal?: AbortSignal;
    onToken?: (chunk: { token: string; fullText: string }) => void;
  }): Promise<{ text: string; architecture?: WebsiteArchitecture }> {
    const { text } = await this.run(options);
    try {
      const parsed = JSON.parse(text) as WebsiteArchitecture;
      return { text, architecture: parsed };
    } catch {
      return { text, architecture: undefined };
    }
  }
}
