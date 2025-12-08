// agents/layout-designer.ts

import { BaseAgent } from "./base-agent";
import type { WebsiteArchitecture } from "./website-architect";

export interface LayoutBlock {
  id: string;
  sectionId: string;
  type:
    | "hero"
    | "feature-grid"
    | "two-column"
    | "testimonial"
    | "pricing"
    | "cta"
    | "faq"
    | "content";
  layoutHints?: string[];
}

export interface LayoutPlan {
  presets?: string[];
  blocks: LayoutBlock[];
  notes?: string;
}

export class LayoutDesignerAgent extends BaseAgent {
  constructor(config?: Partial<ConstructorParameters<typeof BaseAgent>[4]>) {
    super(
      "layout-designer",
      "layout-designer",
      "Layout Designer",
      "Suggests layout blocks and visual structure based on the architecture + copy.",
      {
        model:
          config?.model ||
          process.env.WEBSTUDIO_LAYOUT_MODEL ||
          "deepseek/deepseek-r1:free",
        temperature: config?.temperature ?? 0.4,
        maxTokens: config?.maxTokens ?? 2200,
        stream: config?.stream ?? true,
        systemPrompt: config?.systemPrompt,
      }
    );
  }

  protected getDefaultSystemPrompt(): string {
    return [
      "You are the Layout Designer for AiAppsy Web Studio.",
      "Your job is to map sections to layout blocks that can be rendered in a modern UI (e.g. Tailwind + React, Elementor, etc.).",
      "",
      "Output JSON of the form:",
      "",
      "{",
      '  "presets": string[] (optional list of global style hints),',
      '  "blocks": [',
      "    {",
      '      "id": string,',
      '      "sectionId": string,',
      '      "type": "hero" | "feature-grid" | "two-column" | "testimonial" | "pricing" | "cta" | "faq" | "content",',
      '      "layoutHints"?: string[]',
      "    }",
      "  ],",
      '  "notes"?: string',
      "}",
      "",
      "Guidelines:",
      "- Prefer simple, reusable block types.",
      "- Use `hero` for the main above-the-fold section.",
      "- Use `cta` for strong call-to-action strips.",
      "- Use `feature-grid` or `two-column` for services/benefits.",
      "- Use `testimonial` and `pricing` only when clearly relevant.",
      "- `content` is the generic fallback block.",
    ].join("\n");
  }

  protected buildUserPrompt(
    input: string,
    context?: Record<string, any>
  ): string {
    const arch = context?.architecture as WebsiteArchitecture | undefined;
    const copyJson = context?.copyJson as string | undefined;

    const archJson = arch ? JSON.stringify(arch, null, 2) : "";
    const copyBlock = copyJson
      ? `Website copy JSON:\n${copyJson}\n`
      : "No copy JSON was provided. Base your layout on the architecture only.\n";

    return [
      "Design a layout plan for the following website.",
      "",
      archJson && `Architecture JSON:\n${archJson}\n`,
      copyBlock,
      "Return only the JSON layout object as described in the system prompt.",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
