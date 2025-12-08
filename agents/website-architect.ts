import { BaseAgent } from "../base-agent";

export class WebsiteArchitectAgent extends BaseAgent {
  constructor() {
    super({
      name: "website-architect",
      description: "Creates the full website architecture and sitemap.",
      systemPrompt: "You design structured site architecture.",
      defaultModel: "anthropic/claude-3-sonnet",
      temperature: 0.5,
    });
  }

  async execute(input: any) {
    const messages = [
      { role: "system", content: this.definition.systemPrompt },
      { role: "user", content: JSON.stringify(input) },
    ];

    return this["executeWithOpenRouter"](messages);
  }
}
