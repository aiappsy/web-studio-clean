import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { savePage, savePageVersion } from "./actions";
import Link from "next/link";

export default async function EditorPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth");

  const workspaceId = session.user.workspaceId;
  const pageId = params.pageId;

  // Load page + verify ownership
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      project: { workspaceId },
    },
    include: {
      project: true,
      versions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!page) return notFound();

  const tree = page.tree || {};

  return (
    <div className="flex h-screen">
      {/* LEFT SIDEBAR – Page Information + Actions */}
      <aside className="w-72 border-r p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
        <div>
          <h2 className="text-xl font-bold mb-2">{page.name}</h2>
          <p className="text-sm text-gray-500 break-all">{page.path}</p>
        </div>

        {/* Save page */}
        <form action={savePage} className="space-y-2">
          <input type="hidden" name="pageId" value={pageId} />

          <textarea
            name="tree"
            defaultValue={JSON.stringify(tree, null, 2)}
            className="w-full h-48 text-sm font-mono p-2 border rounded resize-none"
          />

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
            Save Page
          </button>
        </form>

        {/* Save version */}
        <form action={savePageVersion} className="space-y-2">
          <input type="hidden" name="pageId" value={pageId} />
          <input
            type="text"
            name="label"
            placeholder="Version label"
            className="w-full border px-2 py-1 rounded"
          />
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded">
            Save Version
          </button>
        </form>

        {/* Versions list */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Versions</h3>
          <ul className="space-y-2 text-sm">
            {page.versions.map((v) => (
              <li
                key={v.id}
                className="p-2 border rounded bg-white dark:bg-gray-800"
              >
                <div className="font-medium">{v.label || "Untitled"}</div>
                <div className="text-gray-500 text-xs">
                  {new Date(v.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Back to project */}
        <Link
          href={`/dashboard/projects/${page.projectId}`}
          className="block text-center mt-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ← Back to Project
        </Link>
      </aside>

      {/* MAIN EDITOR AREA */}
      <main className="flex-1 p-10 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">Visual Editor</h1>

        <div className="border rounded-lg p-6 bg-white dark:bg-gray-800">
          <p className="text-gray-500 mb-4">
            This is where your **drag-and-drop visual editor** will go.
          </p>

          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-auto">
            {JSON.stringify(tree, null, 2)}
          </pre>
        </div>
      </main>
    </div>
  );
}
