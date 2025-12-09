import { prisma } from "@/lib/db";

export async function getUserWorkspace(userId: string) {
  return prisma.workspace.findFirst({
    where: {
      users: {
        some: { id: userId }
      }
    },
  });
}
