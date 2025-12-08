
export async function POST(req) {
  const { site, pageName } = await req.json();
  return Response.json({ page:{ name:pageName, sections:[] }});
}
