import { getProjects } from "@/app/(dashboard)/actions";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function ProjectsPage() {
  const session = await auth();

  // User must be logged in
  if (!session?.user) {
    return <div className="p-8">Not authenticated.</div>;
  }

  const workspaceId = session.user.workspaceId;

  // Fetch projects for this workspace
  const result = await getProjects(workspaceId);

  if (!result?.success) {
    return (
      <div className="p-8 text-red-600">
        Failed to load projects.
      </div>
    );
  }

  const projects = result.projects;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Your Projects</h1>

      {/* Create Project Form */}
      <form
        action="/dashboard/projects/create"
        method="POST"
        className="space-y-2 w-full max-w-md"
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />

        <input
          name="name"
          className="border px-3 py-2 rounded w-full"
          placeholder="Project name"
          required
        />

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Project
        </button>
      </form>

      {/* Project List */}
      <div className="space-y-4">
        {projects.length === 0 && (
          <p className="text-gray-500">No projects yet.</p>
        )}

        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="block border rounded p-4 hover:bg-gray-50 transition"
          >
            <div className="font-medium">{project.name}</div>
            <div className="text-sm text-gray-500">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
