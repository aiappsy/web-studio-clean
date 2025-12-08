
export async function POST(req) {
  const { input } = await req.json();
  return Response.json({ site:{ name:'AI Site', pages:[] }});
}
