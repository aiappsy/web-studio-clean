import { NextResponse } from "next/server";
import { aiRequest } from "@/lib/ai-client";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, model, userKey } = await req.json();

  const result = await aiRequest({
    prompt,
    model,
    userKey,
  });

  return NextResponse.json({ result });
}
