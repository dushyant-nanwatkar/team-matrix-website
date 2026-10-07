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

// Extracts storeId from BLOB_STORE_ID or from the standard BLOB_READ_WRITE_TOKEN
// (format: vercel_blob_rw_<storeId>_<secret>)
function resolveBlobStoreId(): string | null {
  const envStoreId = process.env.BLOB_STORE_ID;
  if (envStoreId) {
    return envStoreId.replace(/^store_/, "").trim();
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    const parts = token.split("_");
    if (parts.length >= 4 && parts[0] === "vercel" && parts[1] === "blob") {
      return parts[3];
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const rawPathname = request.nextUrl.searchParams.get("pathname");
  if (!rawPathname) {
    return NextResponse.json({ error: "Missing pathname" }, { status: 400 });
  }

  // Safely normalize the storage pathname
  let pathname = rawPathname.replace(/^\/+/, "");
  try {
    if (pathname.includes("http://") || pathname.includes("https://")) {
      const parsed = new URL(pathname.startsWith("http") ? pathname : `https://${pathname}`);
      pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
    } else {
      pathname = decodeURIComponent(pathname);
    }
  } catch {
    // Keep pathname as is if decode fails
  }
  pathname = pathname.replace(/^\/+/, "");

  const ext = path.extname(pathname.split("?")[0]).toLowerCase();
  const defaultContentType = MIME_TYPES[ext] || "application/octet-stream";
  const ifNoneMatch = request.headers.get("if-none-match");
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  // 1. Direct fetch via storeId on public blob storage
  const storeId = resolveBlobStoreId();
  if (storeId) {
    const publicBlobUrl = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;

    // Try public fetch first, then with Bearer token if private or restricted
    const authAttempts: (string | undefined)[] = [undefined];
    if (token) {
      authAttempts.push(token);
    }

    for (const authToken of authAttempts) {
      try {
        const fetchHeaders: Record<string, string> = {};
        if (ifNoneMatch) fetchHeaders["If-None-Match"] = ifNoneMatch;
        if (authToken) fetchHeaders["Authorization"] = `Bearer ${authToken}`;

        const res = await fetch(publicBlobUrl, {
          headers: Object.keys(fetchHeaders).length > 0 ? fetchHeaders : undefined,
        });

        if (res.status === 304) {
          return new NextResponse(null, { status: 304 });
        }

        if (res.ok) {
          const contentType = res.headers.get("content-type") || defaultContentType;
          const etag = res.headers.get("etag");
          const buffer = Buffer.from(await res.arrayBuffer());

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
              "X-Content-Type-Options": "nosniff",
              ...(etag ? { ETag: etag } : {}),
            },
          });
        }
      } catch {
        // Continue to next attempt
      }
    }
  }

  // 2. Try @vercel/blob SDK `get` (tries public first, then private)
  if (token) {
    const accessModes: ("public" | "private")[] =
      process.env.BLOB_ACCESS === "private" ? ["private", "public"] : ["public", "private"];

    for (const access of accessModes) {
      try {
        const result = await get(pathname, { access, token });
        if (result && result.statusCode === 200 && result.stream) {
          const contentType = result.blob.contentType || defaultContentType;
          const etag = result.blob.etag;
          const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
              "X-Content-Type-Options": "nosniff",
              ...(etag ? { ETag: etag } : {}),
            },
          });
        }
      } catch {
        // Continue to next access mode
      }
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
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    // Ignore
  }

  return new NextResponse("Not found", { status: 404 });
}
