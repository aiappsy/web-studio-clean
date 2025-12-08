
import { prisma } from "@/lib/prisma";
import { ComponentNode } from "./types";

export async function loadPageTree(pageId: string): Promise<ComponentNode>{
  const page = await prisma.page.findUnique({ where:{ id: pageId }});
  return page?.tree as ComponentNode;
}

export async function savePageTree(pageId: string, tree: ComponentNode){
  await prisma.page.update({
    where:{ id: pageId },
    data:{ tree }
  });
}
