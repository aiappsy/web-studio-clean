import { BaseAgent } from "../base-agent";

export class LayoutDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: "layout-designer",
      description: "Generates layout structures for website pages.",
      systemPrompt: "You are a layout generator AI.",
      defaultModel: "anthropic/claude-3-sonnet",
      temperature: 0.4,
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
