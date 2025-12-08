
export async function aiGenerate(prompt: string){
  try{
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.AI_DEFAULT_MODEL || "deepseek/deepseek-r1-0528:free",
          messages:[{ role:"user", content: prompt }]
        })
      }
    );
    const json = await res.json();
    return json.choices?.[0]?.message?.content || "";
  } catch(e){
    return "";
  }
}
