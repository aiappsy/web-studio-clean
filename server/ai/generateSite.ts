
import { aiGenerate } from "@/lib/ai";

export async function generateSite(userPrompt: string){
  const prompt = `
  Build a JSON website structure.
  Include pages: Home, About, Contact.
  Each page must have a JSON component tree.
  User prompt: ${userPrompt}
  `;

  const output = await aiGenerate(prompt);

  return {
    name: "AI Generated Site",
    pages: [
      {
        id: "home",
        name: "Home",
        path: "/",
        tree: {
          id: "root",
          type: "Heading",
          props: { text: "Welcome to your AI Site" },
          children: []
        }
      }
    ],
    raw: output
  };
}
