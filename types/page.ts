
import { ComponentNode } from "./builder";

export interface Page {
  id: string;
  name: string;
  path: string;
  projectId: string;
  tree: ComponentNode;
  createdAt: string;
  updatedAt: string;
}
