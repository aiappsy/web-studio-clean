import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const siteId = params.siteId;

    // Fetch site with pages
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: { pages: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Create ZIP
    const zip = new JSZip();

    // Add each page as an HTML file
    site.pages.forEach((page) => {
      const filename =
        page.slug === "index" ? "index.html" : `${page.slug}.html`;

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title || "Untitled Page"}</title>
</head>
<body>
  ${page.html || ""}
</body>
</html>
`;

      zip.file(filename, html);
    });

    // Generate the ZIP as a Buffer
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${site.name}_export.zip"`,
      },
    });
  } catch (error) {
    console.error("ZIP download error:", error);
    return NextResponse.json(
      { error: "Failed to generate ZIP file" },
      { status: 500 }
    );
  }
}
