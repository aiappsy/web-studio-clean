
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(req) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return Response.json({ success: false, error: "Missing fields" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return Response.json({ success: false, error: "User already exists" });
    }

    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        workspace: {
          create: { name: name ? name + "'s Workspace" : "Workspace" }
        }
      }
    });

    return Response.json({ success: true, user });
  } catch (e) {
    return Response.json({ success: false, error: e.message });
  }
}
