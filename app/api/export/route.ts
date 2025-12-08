import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { siteId } = await req.json();

  const job = await prisma.exportJob.create({
    data: {
      siteId,
      status: "queued",
    },
  });

  // Worker will pick this up
  return NextResponse.json({ jobId: job.id });
}
