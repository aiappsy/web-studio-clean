
import { ComponentNode } from "./builder";

export interface Template {
  id: string;
  name: string;
  description?: string;
  tree: ComponentNode;
  workspaceId: string;
}
