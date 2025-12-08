import { 
  BaseAgent, 
  AgentResponse 
} from "../base-agent";

import { z } from "zod";

// Layout Designer Agent - Responsible for creating website layouts and designs
export class LayoutDesignerAgent extends BaseAgent {

  constructor() {
    super({
      id: "layout-designer",
      name: "Layout Designer",
      description: "Generates layout structures and visual design systems for website pages.",
      defaultModel: "gpt-4o-mini",
      temperature: 0.6,
      maxTokens: 2000,
    });
  }

  schema = z.object({
    websiteType: z.string().optional(),
    businessDescription: z.string(),
    style: z.string().optional(),
    colorScheme: z.string().optional(),
  });

  async execute(input: any): Promise<AgentResponse> {
    const validated = this.schema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.message,
        agent: this.definition.id,
        latency: 0,
        model: this.definition.defaultModel,
      };
    }

    const prompt = `
You are an expert website layout designer.

Business description:
${validated.data.businessDescription}

Website type: ${validated.data.websiteType || "business"}
Preferred style: ${validated.data.style || "modern"}
Color scheme: ${validated.data.colorScheme || "neutral"}

Generate:
- A responsive layout grid
- Section structure
- Component list (Hero, Features, CTAs, Forms, Footer)
- Typography recommendations
- Spacing system (px scale)
- Color palette suggestions
    `;

    const start = Date.now();
    const ai = await this.sendMessage([{ role: "user", content: prompt }]);

    return {
      success: true,
      data: ai,
      agent: this.definition.id,
      latency: Date.now() - start,
      model: this.definition.defaultModel,
    };
  }
}
