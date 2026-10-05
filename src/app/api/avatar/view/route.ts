import fs from "fs";
import path from "path";
import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

export const dynamic = "force-dynamic";

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
  ".mp4": "video/mp4",
};

export async function GET(request: NextRequest) {
  const rawPathname = request.nextUrl.searchParams.get("pathname");
  if (!rawPathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }

  const pathname = rawPathname.replace(/^\/+/, "");
  const ext = path.extname(pathname.split("?")[0]).toLowerCase();
  const defaultContentType = MIME_TYPES[ext] || "application/octet-stream";

  // 1. If BLOB_STORE_ID is set, public store assets are directly reachable via HTTPS.
  // This bypasses SDK authentication issues when client GET requests lack an OIDC token.
  const rawStoreId = process.env.BLOB_STORE_ID;
  if (rawStoreId) {
    const storeId = rawStoreId.replace(/^store_/, "").trim();
    const publicBlobUrl = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;

    try {
      const ifNoneMatch = request.headers.get("if-none-match");
      const res = await fetch(publicBlobUrl, {
        headers: ifNoneMatch ? { "If-None-Match": ifNoneMatch } : undefined,
      });

      if (res.status === 304) {
        return new NextResponse(null, { status: 304 });
      }

      if (res.ok && res.body) {
        const contentType = res.headers.get("content-type") || defaultContentType;
        const etag = res.headers.get("etag");
        return new NextResponse(res.body as unknown as ReadableStream, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            ...(etag ? { ETag: etag } : {}),
          },
        });
      }
    } catch (err) {
      // Continue to next strategy if fetch failed
    }
  }

  // 2. If BLOB_READ_WRITE_TOKEN is set, use SDK `get` (supports private store access)
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const access = (process.env.BLOB_ACCESS as "public" | "private") || "private";
    try {
      const result = await get(pathname, { access, token });
      if (result && result.statusCode === 200 && result.stream) {
        return new NextResponse(result.stream, {
          headers: {
            "Content-Type": result.blob.contentType || defaultContentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // 3. Fallback to bundled local /public/<pathname>
  try {
    const publicDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "public");
    const resolvedPath = path.join(publicDir, pathname);
    if (resolvedPath.startsWith(publicDir + path.sep) && fs.existsSync(resolvedPath)) {
      const buffer = fs.readFileSync(resolvedPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": defaultContentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    // Ignore
  }

  return new NextResponse("Not found", { status: 404 });
}
