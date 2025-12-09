import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function PreviewPage({
  params,
}: {
  params: { siteId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const siteId = params.siteId;

  // Fetch site + workspace + pages
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      workspace: true,
      pages: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!site) return notFound();

  // Protect multi-tenant access
  if (site.workspace.ownerId !== session.user.id) redirect("/dashboard");

  // Build a simple HTML preview
  // NOTE: For now we only preview the latest page (like page builder tools)
  const latestPage = site.pages[0];
  const html = latestPage?.content || "<h1>No content yet</h1>";

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Bar */}
      <div className="w-full p-3 border-b bg-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Preview: {site.name}</h2>
        </div>

        <div className="flex gap-3">
          <a
            href={`/dashboard/editor/${latestPage?.id}`}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back to Editor
          </a>

          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Preview Iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups"
          srcDoc={html}
        />
      </div>
    </div>
  );
}
