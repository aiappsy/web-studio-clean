import { getProject } from "@/app/(dashboard)/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function ProjectDetailPage({ params }) {
  const session = await auth();
  if (!session?.user) return notFound();

  const projectId = params.id;

  // Load project with pages
  const result = await getProject(projectId);
  if (!result?.success) return notFound();

  const project = result.project;

  // Security: ensure user belongs to workspace that owns this project
  if (project.workspaceId !== session.user.workspaceId) return notFound();

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">
        Project: {project.name}
      </h1>

      {/* Create Page */}
      <form
        action="/dashboard/projects/createPage"
        method="POST"
        className="space-y-2"
      >
        <input type="hidden" name="projectId" value={project.id} />

        <input
          name="name"
          className="border px-3 py-2 rounded w-full"
          placeholder="New page name"
          required
        />

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Page
        </button>
      </form>

      {/* Page list */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pages</h2>

        {project.pages.length === 0 && (
          <p className="text-gray-500">No pages yet.</p>
        )}

        {project.pages.map((page) => (
          <div
            key={page.id}
            className="border rounded p-4 flex items-center justify-between"
          >
            <div>
              <div className="font-medium">{page.name}</div>
              <div className="text-gray-500 text-sm">{page.path}</div>
            </div>

            <div className="flex space-x-3">
              {/* Editor */}
              <Link
                href={`/dashboard/editor/${page.id}`}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Edit
              </Link>

              {/* Preview */}
              <Link
                href={`/dashboard/preview/${page.id}`}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Preview
              </Link>

              {/* Duplicate */}
              <form method="POST" action="/dashboard/projects/duplicatePage">
                <input type="hidden" name="pageId" value={page.id} />
                <button className="px-3 py-1 bg-yellow-400 rounded">
                  Duplicate
                </button>
              </form>

              {/* Delete */}
              <form method="POST" action="/dashboard/projects/deletePage">
                <input type="hidden" name="pageId" value={page.id} />
                <button className="px-3 py-1 bg-red-500 text-white rounded">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
