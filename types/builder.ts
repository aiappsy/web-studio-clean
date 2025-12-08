
export interface ComponentNode {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: ComponentNode[];
}

export interface BuilderComponentSchema {
  name: string;
  props: Record<string, any>;
}
