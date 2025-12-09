import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { success: false, error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashed = await hash(password, 10);

    // Create user AND workspace in a single atomic transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        // Create workspace directly and link via relation
        workspace: {
          create: {
            name: name ? `${name}'s Workspace` : "My Workspace",
          },
        },
      },
      include: {
        workspace: true, // Return the workspace in the response
      },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      workspaceId: user.workspace.id,
    });
  } catch (e: any) {
    console.error("REGISTER ERROR:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Registration failed" },
      { status: 500 }
    );
  }
}
