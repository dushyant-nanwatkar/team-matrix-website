import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth, isBlobConfigured } from "@/lib/admin-files";

const PUBLIC_DIRS = [
  "members",
  "alumni",
  "sponsors",
  "stories",
  "achievements",
  "objects",
  "projects",
];

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  let customToken = "";
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.token === "string" && body.token.trim()) {
      customToken = body.token.trim();
    }
  } catch {
    // empty body is fine
  }

  const token = customToken || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "BLOB_READ_WRITE_TOKEN is not configured on this environment." },
      { status: 400 }
    );
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
        if (filename.startsWith(".") || filename.endsWith(".md") || filename.endsWith(".json")) continue;

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
            token,
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

  // 2. Upload JSON datasets
  const JSON_FILES = [
    { key: "data/members.json", local: "src/data/members.json" },
    { key: "data/projects.json", local: "src/data/projects.json" },
    { key: "data/sponsors.json", local: "src/data/sponsors.json" },
    { key: "data/achievements.json", local: "public/achievements/captions.json" },
    { key: "data/stories.json", local: "public/stories/captions.json" },
  ];

  let uploadedJsons = 0;
  for (const item of JSON_FILES) {
    const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), item.local);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      await put(item.key, content, {
        access,
        allowOverwrite: true,
        contentType: "application/json",
        token,
      });
      uploadedJsons++;
    } catch (err) {
      errors.push(`${item.key}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Migration completed successfully",
    stats: {
      uploadedFiles,
      skippedFiles,
      uploadedJsons,
      errors: errors.length > 0 ? errors.slice(0, 5) : [],
    },
  });
}
