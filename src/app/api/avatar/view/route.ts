import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { isBlobConfigured } from "@/lib/admin-files";

const MIME_TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".obj": "model/obj",
  ".mtl": "text/plain",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

export async function GET(request: NextRequest) {
  const rawPathname = request.nextUrl.searchParams.get("pathname");
  if (!rawPathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }

  const pathname = rawPathname.replace(/^\/+/, "");
  const access = (process.env.BLOB_ACCESS as "public" | "private") || "private";

  // 1. Try Vercel Blob first (when configured)
  if (isBlobConfigured()) {
    try {
      const result = await get(pathname, { access });
      if (result && result.statusCode === 200 && result.stream) {
        return new NextResponse(result.stream, {
          headers: {
            "Content-Type": result.blob.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // 2. Fallback to local /public/<pathname>
  try {
    const publicDir = path.join(process.cwd(), "public");
    const resolvedPath = path.join(publicDir, pathname);
    if (resolvedPath.startsWith(publicDir + path.sep) && fs.existsSync(resolvedPath)) {
      const ext = path.extname(pathname).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const buffer = fs.readFileSync(resolvedPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    // Ignore and return 404
  }

  return new NextResponse("Not found", { status: 404 });
}
