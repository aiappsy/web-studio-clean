import { AgentContext, AgentResult } from "./base-agent";
import { WebsiteArchitectAgent } from "./definitions/website-architect";
import { ContentWriterAgent } from "./definitions/content-writer";
import { LayoutDesignerAgent } from "./definitions/layout-designer";

export class AgentRunner {
  private agents = {
    "website-architect": new WebsiteArchitectAgent(),
    "content-writer": new ContentWriterAgent(),
    "layout-designer": new LayoutDesignerAgent(),
  };

  setContext(ctx: AgentContext) {
    Object.values(this.agents).forEach((a) => a.setContext(ctx));
  }

  async runAgent(name: string, input: any): Promise<AgentResult> {
    const agent = this.agents[name];
    if (!agent) throw new Error(`Agent not found: ${name}`);
    return agent.execute(input);
  }
}

export const agentRunner = new AgentRunner();
