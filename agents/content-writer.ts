import { BaseAgent } from "../base-agent";

export class ContentWriterAgent extends BaseAgent {
  constructor() {
    super({
      name: "content-writer",
      description: "Writes SEO-optimized page content.",
      systemPrompt: "You generate professional website copy.",
      defaultModel: "anthropic/claude-3-sonnet",
      temperature: 0.6,
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
