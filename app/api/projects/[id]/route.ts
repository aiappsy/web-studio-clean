
export async function GET(req, { params }) { return Response.json({ id: params.id }); }
export async function DELETE(req, { params }) { return Response.json({ deleted: params.id }); }
