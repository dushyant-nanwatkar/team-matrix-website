import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { put, del, list, get } from "@vercel/blob";
import { isAuthenticated } from "./admin-auth";
export { getAssetUrl } from "./asset-url";

// Server-only helpers shared by the admin CRUD route handlers. Never import
// this from a "use client" file.

export function requireAuth(request: NextRequest): NextResponse | null {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  return null;
}

export function isBlobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)
  );
}

// Matches your Vercel Blob store setting ('private' by default from Vercel's quickstart,
// or 'public' if you configured a public store)
const BLOB_ACCESS: "public" | "private" =
  (process.env.BLOB_ACCESS as "public" | "private") || "private";

const ALLOWED_IMAGE_EXTS: Record<string, string> = {
  "image/webp": ".webp",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/avif": ".avif",
};

// Writes an uploaded image either to Vercel Blob (when deployed with BLOB_READ_WRITE_TOKEN)
// or /public/<subdir>/ (during local development without blob config).
export async function saveUploadedImage(file: File, subdir: string): Promise<string> {
  const fallbackExt = file.name ? path.extname(file.name).toLowerCase() : "";
  const ext =
    ALLOWED_IMAGE_EXTS[file.type] ||
    (fallbackExt === ".jpg" || fallbackExt === ".jpeg"
      ? ".jpg"
      : fallbackExt === ".png"
      ? ".png"
      : fallbackExt === ".webp"
      ? ".webp"
      : fallbackExt === ".avif"
      ? ".avif"
      : null);
  if (!ext) {
    throw new Error("Unsupported image type — use WEBP, PNG, or JPEG");
  }

  const filename = `${crypto.randomBytes(10).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isBlobConfigured()) {
    const pathname = `${subdir}/${filename}`;
    const blob = await put(pathname, buffer, {
      access: BLOB_ACCESS,
      contentType: file.type || `image/${ext.replace(".", "")}`,
    });

    return BLOB_ACCESS === "private"
      ? `/api/avatar/view?pathname=${encodeURIComponent(blob.pathname)}`
      : blob.url;
  }

  const destDir = path.join(process.cwd(), "public", subdir);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, filename), buffer);

  return `/${subdir}/${filename}`;
}

// Best-effort delete of a previously uploaded file.
// Supports private blob proxy URLs, direct Vercel Blob URLs, and local public files.
export async function deletePublicFile(urlPath: string): Promise<void> {
  if (!urlPath) return;

  // 1. If it's a private blob URL routed through /api/avatar/view
  if (urlPath.includes("/api/avatar/view?pathname=")) {
    if (isBlobConfigured()) {
      try {
        const u = new URL(urlPath, "http://localhost");
        const pathname = u.searchParams.get("pathname");
        if (pathname) {
          await del(pathname);
        }
      } catch (err) {
        console.warn(`[blob] Failed to delete blob ${urlPath}:`, err);
      }
    }
    return;
  }

  // 2. If it's a direct Vercel Blob URL (public store)
  if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
    if (isBlobConfigured()) {
      try {
        await del(urlPath);
      } catch (err) {
        console.warn(`[blob] Failed to delete blob ${urlPath}:`, err);
      }
    }
    return;
  }

  // 3. Local file delete
  try {
    const publicDir = path.join(process.cwd(), "public");
    const rel = urlPath.replace(/^\/+/, "");
    const resolved = path.join(publicDir, rel);
    if (!resolved.startsWith(publicDir + path.sep)) return;
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  } catch {
    // already gone — fine
  }
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, data: unknown) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  } catch {
    // Read-only filesystem in serverless environments
  }
}

// Reads JSON data either from Vercel Blob (if configured) or falls back to local file.
export async function readJsonData<T>(key: string, localFilePath: string, fallback: T): Promise<T> {
  if (isBlobConfigured()) {
    try {
      const result = await get(key, { access: BLOB_ACCESS });
      if (result && result.stream) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as T;
      }
    } catch (err) {
      console.warn(`[blob] Could not read ${key} from Blob, falling back to local file:`, err);
    }
  }
  return readJsonFile<T>(localFilePath, fallback);
}

// Writes JSON data either to Vercel Blob (if configured) and attempts local write.
export async function writeJsonData<T>(key: string, localFilePath: string, data: T): Promise<void> {
  if (isBlobConfigured()) {
    try {
      await put(key, JSON.stringify(data, null, 2), {
        access: BLOB_ACCESS,
        allowOverwrite: true,
        contentType: "application/json",
      });
    } catch (err) {
      console.error(`[blob] Failed to write ${key} to Blob:`, err);
      throw err;
    }
  }
  try {
    writeJsonFile(localFilePath, data);
  } catch {
    // Read-only environment, safe to ignore
  }
}

const ALLOWED_MODEL_EXTS = new Set([".obj", ".mtl", ".glb", ".gltf"]);

export async function saveUploadedModelFile(file: File, subdir = "objects"): Promise<string> {
  const originalName = file.name || "model.obj";
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_MODEL_EXTS.has(ext)) {
    throw new Error(`Unsupported model file type "${ext}" — use .obj, .mtl, .glb, or .gltf`);
  }

  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "model";
  const hash = crypto.randomBytes(4).toString("hex");
  const targetFilename = `${base}_${hash}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isBlobConfigured()) {
    const pathname = `${subdir}/${targetFilename}`;
    const blob = await put(pathname, buffer, {
      access: BLOB_ACCESS,
    });
    return BLOB_ACCESS === "private"
      ? `/api/avatar/view?pathname=${encodeURIComponent(blob.pathname)}`
      : blob.url;
  }

  const destDir = path.join(process.cwd(), "public", subdir);
  fs.mkdirSync(destDir, { recursive: true });
  let localFilename = `${base}${ext}`;
  let targetPath = path.join(destDir, localFilename);
  if (fs.existsSync(targetPath)) {
    localFilename = targetFilename;
    targetPath = path.join(destDir, targetFilename);
  }
  fs.writeFileSync(targetPath, buffer);

  return `/${subdir}/${localFilename}`;
}

export async function listPublicObjectFiles(): Promise<{ name: string; path: string; size: number; ext: string }[]> {
  const result: { name: string; path: string; size: number; ext: string }[] = [];
  const seenNames = new Set<string>();

  const objectsDir = path.join(process.cwd(), "public", "objects");
  if (fs.existsSync(objectsDir)) {
    try {
      const files = fs.readdirSync(objectsDir);
      for (const name of files) {
        if (name.startsWith(".")) continue;
        const fullPath = path.join(objectsDir, name);
        const stat = fs.statSync(fullPath);
        const ext = path.extname(name).toLowerCase();
        seenNames.add(name);
        result.push({
          name,
          path: `/objects/${name}`,
          size: stat.size,
          ext,
        });
      }
    } catch {
      // directory read failure
    }
  }

  if (isBlobConfigured()) {
    try {
      const { blobs } = await list({ prefix: "objects/" });
      for (const blob of blobs) {
        const name = path.basename(blob.pathname);
        const ext = path.extname(name).toLowerCase();
        if (!seenNames.has(name)) {
          seenNames.add(name);
          const modelPath =
            BLOB_ACCESS === "private"
              ? `/api/avatar/view?pathname=${encodeURIComponent(blob.pathname)}`
              : blob.url;
          result.push({
            name,
            path: modelPath,
            size: blob.size,
            ext,
          });
        }
      }
    } catch (err) {
      console.warn("[blob] Failed to list object blobs:", err);
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
