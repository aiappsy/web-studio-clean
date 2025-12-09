import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { deleteProject, duplicateProject } from "../actions";

export default async function ProjectDetailPage({ params }) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth");
  }

  const workspaceId = session.user.workspaceId;
  const projectId = params.id;

  // 1️⃣ LOAD PROJECT + PAGES
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId, // ensures user can ONLY access their own workspace's projects
    },
    include: {
      pages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) return notFound();

  return (
    <div className="p-10 space-y-10">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-gray-500">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/dashboard/editor/${projectId}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Open Editor
          </Link>

          <Link
            href={`/dashboard/preview/${projectId}`}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-md"
          >
            Preview
          </Link>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4">
        {/* Duplicate */}
        <form action={duplicateProject}>
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            Duplicate Project
          </button>
        </form>

        {/* Delete */}
        <form action={deleteProject}>
          <input type="hidden" name="projectId" value={project.id} />
          <button
            type="submit"
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Delete Project
          </button>
        </form>
      </div>

      {/* PAGES LIST */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Pages</h2>

        {project.pages.length === 0 ? (
          <div className="text-gray-500">This project has no pages yet.</div>
        ) : (
          <ul className="space-y-3">
            {project.pages.map((page) => (
              <li key={page.id}>
                <Link
                  href={`/dashboard/editor/${page.id}`}
                  className="block border p-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                >
                  <div className="text-lg font-medium">{page.name}</div>
                  <div className="text-sm text-gray-500">{page.path}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
