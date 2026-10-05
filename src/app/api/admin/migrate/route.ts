import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { put, head, get, BlobNotFoundError } from "@vercel/blob";
import { requireAuth, isBlobConfigured } from "@/lib/admin-files";
import { normalizeStories } from "@/lib/stories";
import { ALUMNI } from "@/data/alumni";
import { toStoragePathname } from "@/lib/asset-url";

const PUBLIC_DIRS = [
  "members",
  "alumni",
  "sponsors",
  "stories",
  "achievements",
  "objects",
  "projects",
];

// Uploading every asset can take a while — allow longer than the default.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  let customToken = "";
  let force = false;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.token === "string" && body.token.trim()) {
      customToken = body.token.trim();
    }
    if (body && body.force) {
      force = Boolean(body.force);
    }
  } catch {
    // empty body is fine
  }

  const hasAuth = Boolean(customToken || isBlobConfigured());

  if (!hasAuth) {
    return NextResponse.json(
      {
        ok: false,
        code: "BLOB_NOT_CONFIGURED",
        error:
          "Vercel Blob is not connected to this project yet. In Vercel Dashboard → Storage → your Blob store → Projects tab, click 'Connect Project' and select team-matrix-website, or paste your token into the prompt.",
      },
      { status: 400 }
    );
  }

  const token = customToken || process.env.BLOB_READ_WRITE_TOKEN || undefined;

  // If a custom token was provided in local dev, persist it to .env.local
  if (customToken) {
    try {
      const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), ".env.local");
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      if (!content.includes("BLOB_READ_WRITE_TOKEN")) {
        content += `\nBLOB_READ_WRITE_TOKEN="${customToken}"\n`;
        fs.writeFileSync(envPath, content.trim() + "\n", "utf-8");
      }
    } catch {
      // In read-only environments, ignore
    }
  }

  const access = (process.env.BLOB_ACCESS as "public" | "private") || "private";
  let uploadedFiles = 0;
  let skippedFiles = 0;
  let errors: string[] = [];

  // 1. Upload public directory assets
  for (const dirName of PUBLIC_DIRS) {
    const dirPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", dirName);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const files = fs.readdirSync(dirPath);
      for (const filename of files) {
        if (
          filename.startsWith(".") ||
          filename.endsWith(".md") ||
          filename.endsWith(".json") ||
          filename.endsWith(".obj")
        ) continue;

        const filePath = path.join(dirPath, filename);
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        // Skip huge .obj files > 40MB to avoid serverless function timeouts
        if (stat.size > 40 * 1024 * 1024) {
          skippedFiles++;
          continue;
        }

        const pathname = `${dirName}/${filename}`;
        const buffer = fs.readFileSync(filePath);

        try {
          await put(pathname, buffer, {
            access,
            allowOverwrite: true,
            ...(token ? { token } : {}),
          });
          uploadedFiles++;
        } catch (err) {
          errors.push(`${pathname}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errors.push(`Directory ${dirName}: ${(err as Error).message}`);
    }
  }

  // 2. Upload JSON datasets.
  // Blob is the source of truth once seeded, so existing keys are NOT
  // overwritten (that would wipe admin-panel edits) unless `force` is passed.
  const readLocal = (rel: string) => {
    const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
    return fs.existsSync(fullPath) ? JSON.parse(fs.readFileSync(fullPath, "utf-8")) : undefined;
  };

  const JSON_FILES: { key: string; load: () => unknown }[] = [
    { key: "data/members.json", load: () => readLocal("src/data/members.json") },
    { key: "data/projects.json", load: () => readLocal("src/data/projects.json") },
    { key: "data/sponsors.json", load: () => readLocal("src/data/sponsors.json") },
    { key: "data/achievements.json", load: () => readLocal("public/achievements/captions.json") },
    {
      key: "data/stories.json",
      load: () => {
        const raw = readLocal("public/stories/captions.json");
        return raw === undefined ? undefined : normalizeStories(raw);
      },
    },
    {
      key: "data/alumni.json",
      load: () => ALUMNI.map((a) => ({ ...a, avatarUrl: `/${toStoragePathname(a.avatarUrl)}` })),
    },
  ];

  const blobOpts = { ...(token ? { token } : {}) };
  let uploadedJsons = 0;
  let keptJsons = 0;

  for (const item of JSON_FILES) {
    try {
      let exists = false;
      try {
        await head(item.key, blobOpts);
        exists = true;
      } catch (err) {
        if (!(err instanceof BlobNotFoundError)) throw err;
      }

      // Repair: the first migration copied the stories captions map as-is,
      // but the site expects WorkItem[]. Convert it in place, keeping content.
      if (exists && !force && item.key === "data/stories.json") {
        const current = await get(item.key, { access, useCache: false, ...blobOpts });
        const parsed = current?.stream ? JSON.parse(await new Response(current.stream).text()) : null;
        if (parsed && !Array.isArray(parsed)) {
          await put(item.key, JSON.stringify(normalizeStories(parsed), null, 2), {
            access,
            allowOverwrite: true,
            contentType: "application/json",
            cacheControlMaxAge: 60,
            ...blobOpts,
          });
          uploadedJsons++;
          continue;
        }
      }

      if (exists && !force) {
        keptJsons++;
        continue;
      }

      const data = item.load();
      if (data === undefined) continue;

      await put(item.key, JSON.stringify(data, null, 2), {
        access,
        allowOverwrite: true,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        ...blobOpts,
      });
      uploadedJsons++;
    } catch (err) {
      errors.push(`${item.key}: ${(err as Error).message}`);
    }
  }

  if (uploadedFiles === 0 && uploadedJsons === 0 && keptJsons === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          errors.length > 0
            ? `Nothing was uploaded. First error: ${errors[0]}`
            : "No local files were found to migrate in this deployment.",
        stats: { uploadedFiles, skippedFiles, uploadedJsons, keptJsons, errors: errors.slice(0, 5) },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Migration completed successfully",
    stats: {
      uploadedFiles,
      skippedFiles,
      uploadedJsons,
      keptJsons,
      errors: errors.length > 0 ? errors.slice(0, 5) : [],
    },
  });
}
