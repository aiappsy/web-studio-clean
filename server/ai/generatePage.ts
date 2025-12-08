
import { aiGenerate } from "@/lib/ai";

export async function generatePage(pageName: string){
  const prompt = `
  Generate a component tree JSON for a page named ${pageName}.
  Use type:Heading and type:Paragraph components.
  `;

  const result = await aiGenerate(prompt);

  return {
    id: pageName.toLowerCase(),
    name: pageName,
    tree: {
      id: "root",
      type: "Paragraph",
      props: { text: "Generated content for " + pageName },
      children: []
    },
    raw: result
  };
}
