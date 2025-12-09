"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateId } from "@/utils/ai";

// ---------- CREATE PROJECT ----------
export async function createProject(prevState: any, formData: FormData) {
  try {
    const userId = formData.get("userId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!userId || !name) {
      return { error: "User ID and project name are required" };
    }

    const project = await prisma.project.create({
      data: {
        id: generateId(),
        name,
        workspaceId: userId, // Each user has their own workspace
        // If you want Project to belong to User instead of Workspace, adjust here
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return { success: true, projectId: project.id };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { error: "Failed to create project" };
  }
}

// ---------- UPDATE PROJECT ----------
export async function updateProject(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get("projectId") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!projectId) {
      return { error: "Project ID is required" };
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name || undefined,
        description: description || undefined,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return { success: true };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { error: "Failed to update project" };
  }
}

// ---------- DELETE PROJECT ----------
export async function deleteProject(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get("projectId") as string;

    if (!projectId) {
      return { error: "Project ID is required" };
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { error: "Failed to delete project" };
  }
}

// ---------- DUPLICATE PROJECT ----------
export async function duplicateProject(prevState: any, formData: FormData) {
  try {
    const projectId = formData.get("projectId") as string;
    const newName = formData.get("name") as string;

    if (!projectId) {
      return { error: "Project ID is required" };
    }

    const original = await prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true },
    });

    if (!original) {
      return { error: "Project not found" };
    }

    const newProjectId = generateId();

    await prisma.$transaction(async (tx) => {
      await tx.project.create({
        data: {
          id: newProjectId,
          name: newName || `${original.name} (Copy)`,
          workspaceId: original.workspaceId,
        },
      });

      for (const page of original.pages) {
        await tx.page.create({
          data: {
            id: generateId(),
            projectId: newProjectId,
            name: page.name,
            path: page.path,
            tree: page.tree,
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return { success: true, projectId: newProjectId };
  } catch (error) {
    console.error("Failed to duplicate project:", error);
    return { error: "Failed to duplicate project" };
  }
}

// ---------- GET ONE PROJECT ----------
export async function getProject(projectId: string) {
  try {
    if (!projectId) return { error: "Project ID is required" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true },
    });

    if (!project) return { error: "Project not found" };

    return { success: true, project };
  } catch (error) {
    console.error("Failed to get project:", error);
    return { error: "Failed to get project" };
  }
}

// ---------- GET USER PROJECTS ----------
export async function getProjects(userId: string) {
  try {
    const projects = await prisma.project.findMany({
      where: { workspaceId: userId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, projects };
  } catch (error) {
    console.error("Failed to get projects:", error);
    return { error: "Failed to get projects" };
  }
}
