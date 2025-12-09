import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProject } from "../actions"; 

interface ProjectDetailProps {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/auth");
  }

  const { success, project, error } = await getProject(params.id);

  if (!success || !project) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">Project Error</h2>
        <p className="text-red-600 mt-2">{error ?? "Project not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">{project.name}</h1>

      <div className="text-gray-500">
        Created{" "}
        {new Date(project.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>

      <div className="mt-8">
        <strong>Project ID:</strong>
        <code className="ml-2 bg-black/40 px-2 py-1 rounded">{project.id}</code>
      </div>
    </div>
  );
}
