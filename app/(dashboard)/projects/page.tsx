import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProjects } from "./actions"; // uses the server action we fixed
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function ProjectsPage() {
  // 1️⃣ AUTH — protect this page
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth"); // send unauthenticated users to login
  }

  const workspaceId = session.user.workspaceId;

  if (!workspaceId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">No workspace found</h2>
        <p className="text-gray-600 mt-2">
          Your account does not have an assigned workspace.
        </p>
      </div>
    );
  }

  // 2️⃣ LOAD PROJECTS FOR THIS WORKSPACE
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
        <div className="text-gray-500">
          You have no projects yet. Create your first one!
        </div>
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
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
