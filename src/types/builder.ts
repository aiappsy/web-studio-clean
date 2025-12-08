
export interface ComponentNode {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: ComponentNode[];
}

export interface ComponentSchema {
  [prop: string]: string | string[] | ComponentSchema;
}
