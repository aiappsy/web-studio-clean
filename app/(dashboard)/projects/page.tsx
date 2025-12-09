import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getProjects } from "./actions";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ProjectsPage() {
  // Authenticate user
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth");
  }

  // @ts-ignore
  const workspaceId = session.user.workspaceId as string | undefined;

  if (!workspaceId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">No workspace</h2>
        <p className="text-gray-600 mt-2">
          Your account has no workspace assigned.
        </p>
      </div>
    );
  }

  // Load projects
  const { success, projects, error } = await getProjects(workspaceId);

  if (!success) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Error loading projects</h2>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Projects</h1>

        <Link
          href="/dashboard/projects/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-gray-500">No projects yet. Create one!</div>
      ) : (
        <ul className="space-y-4">
          {projects.map((project: any) => (
            <li key={project.id}>
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="block border p-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition"
              >
                <div className="text-xl font-semibold">{project.name}</div>
                <div className="text-sm text-gray-500">
                  Created{" "}
                  {new Date(project.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
