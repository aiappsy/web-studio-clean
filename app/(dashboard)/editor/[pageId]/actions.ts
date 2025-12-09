"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePage(formData: FormData) {
  const pageId = formData.get("pageId") as string;
  const treeRaw = formData.get("tree") as string;

  try {
    const tree = JSON.parse(treeRaw);

    await prisma.page.update({
      where: { id: pageId },
      data: { tree },
    });

    revalidatePath(`/dashboard/editor/${pageId}`);

    return { success: true };
  } catch (err) {
    console.error("SAVE PAGE ERROR:", err);
    return { error: "Failed to save" };
  }
}

export async function savePageVersion(formData: FormData) {
  const pageId = formData.get("pageId") as string;
  const label = (formData.get("label") as string) || null;

  try {
    const page = await prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) return { error: "Page not found" };

    await prisma.pageVersion.create({
      data: {
        pageId,
        label,
        tree: page.tree,
      },
    });

    revalidatePath(`/dashboard/editor/${pageId}`);

    return { success: true };
  } catch (err) {
    console.error("SAVE VERSION ERROR:", err);
    return { error: "Failed to create version" };
  }
}
