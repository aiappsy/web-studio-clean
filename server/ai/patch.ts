
import { aiGenerate } from "@/lib/ai";

export async function applyPatch(tree, instruction){
  const prompt = `
  Modify this JSON tree based on instruction: ${instruction}
  Tree: ${JSON.stringify(tree)}
  Only return updated JSON.
  `;

  const updated = await aiGenerate(prompt);
  try{
    return JSON.parse(updated);
  } catch {
    return tree;
  }
}
