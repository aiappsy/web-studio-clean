import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return Response.json({ success: false, error: "Missing fields" });
    }

    // Check if user already exists
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return Response.json({ success: false, error: "User already exists" });
    }

    // Hash password
    const hashed = await hash(password, 10);

    // Create user + workspace in one transaction
    const user = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: name ? `${name}'s Workspace` : "My Workspace",
        },
      });

      const newUser = await tx.user.create({
        data: {
          email,
          password: hashed,
          name,
          workspaceId: workspace.id,
        },
      });

      return newUser;
    });

    return Response.json({ success: true, user });
  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return Response.json({ success: false, error: error.message });
  }
}
