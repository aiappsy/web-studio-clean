"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 🔹 Get all projects for a given workspace
export async function getProjects(workspaceId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, projects };
  } catch (err) {
    console.error("GET PROJECTS ERROR:", err);
    return { success: false, error: "Failed to load projects" };
  }
}

// 🔹 Get a single project by ID
export async function getProject(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    return { success: true, project };
  } catch (err) {
    console.error("GET PROJECT ERROR:", err);
    return { success: false, error: "Failed to load project" };
  }
}

// 🔹 Create a new project
export async function createProject(
  workspaceId: string,
  name: string
) {
  try {
    const project = await prisma.project.create({
      data: {
        name,
        workspaceId,
      },
    });

    revalidatePath("/dashboard/projects");

    return { success: true, project };
  } catch (err) {
    console.error("CREATE PROJECT ERROR:", err);
    return { success: false, error: "Failed to create project" };
  }
}
