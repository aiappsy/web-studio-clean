"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Fetch all projects
export async function getProjects() {
  try {
    return await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("GET PROJECTS ERROR:", err);
    return [];
  }
}

// Fetch a single project
export async function getProject(id: string) {
  try {
    return await prisma.project.findUnique({
      where: { id },
    });
  } catch (err) {
    console.error("GET PROJECT ERROR:", err);
    return null;
  }
}

// Create a new project
export async function createProject(name: string) {
  try {
    const project = await prisma.project.create({
      data: { name },
    });

    revalidatePath("/dashboard/projects");
    return { success: true, project };
  } catch (err) {
    console.error("CREATE PROJECT ERROR:", err);
    return { error: "Failed to create project" };
  }
}
