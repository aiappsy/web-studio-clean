import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: params.siteId },
      include: {
        pages: {
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!site) {
      return new NextResponse("Site not found", { status: 404 });
    }

    const zip = new JSZip();

    // Add index.html from latest page
    const latestPage = site.pages[0];
    const html = latestPage?.content || "<h1>No content</h1>";

    zip.file("index.html", html);

    // Add optional CSS folder
    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
      assetsFolder.file("styles.css", "/* Add your CSS here */");
    }

    // Generate zip binary
    const file = await zip.generateAsync({ type: "uint8array" });

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${site.name.replace(
          /\s+/g,
          "_"
        )}.zip"`
      }
    });
  } catch (error) {
    console.error("ZIP ERROR:", error);
    return new NextResponse("Error generating ZIP", { status: 500 });
  }
}
