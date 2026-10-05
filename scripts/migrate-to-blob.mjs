import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";

const token = process.argv[2] || process.env.BLOB_READ_WRITE_TOKEN;
const access = process.env.BLOB_ACCESS || "private";

if (!token) {
  console.error("\x1b[31mError: BLOB_READ_WRITE_TOKEN is required.\x1b[0m");
  console.error("Usage: node scripts/migrate-to-blob.mjs [TOKEN]");
  console.error("Or set BLOB_READ_WRITE_TOKEN in your environment or .env.local");
  process.exit(1);
}

const PUBLIC_DIRS = [
  "members",
  "alumni",
  "sponsors",
  "stories",
  "achievements",
  "objects",
  "projects",
];

async function migrate() {
  console.log(`\n🚀 Starting asset & data migration to Vercel Blob (access: ${access})...\n`);

  let fileCount = 0;
  let bytesCount = 0;

  // 1. Upload media files
  for (const dirName of PUBLIC_DIRS) {
    const dirPath = path.join(process.cwd(), "public", dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);
    for (const filename of files) {
      if (filename.startsWith(".") || filename.endsWith(".md") || filename.endsWith(".json")) continue;

      const filePath = path.join(dirPath, filename);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      // Skip huge .obj files > 45MB if .glb is present to avoid upload timeouts
      if (stat.size > 45 * 1024 * 1024) {
        console.log(`  ⏭️  Skipping large file (${(stat.size / 1024 / 1024).toFixed(1)}MB): ${dirName}/${filename}`);
        continue;
      }

      const pathname = `${dirName}/${filename}`;
      const buffer = fs.readFileSync(filePath);

      process.stdout.write(`  Uploading ${pathname} (${(stat.size / 1024).toFixed(1)} KB)... `);
      try {
        await put(pathname, buffer, {
          access,
          allowOverwrite: true,
          token,
        });
        fileCount++;
        bytesCount += stat.size;
        console.log(`\x1b[32m✓\x1b[0m`);
      } catch (err) {
        console.log(`\x1b[31m✗ (${err.message})\x1b[0m`);
      }
    }
  }

  // 2. Upload JSON datasets
  console.log("\n📦 Migrating JSON data files...");

  const JSON_FILES = [
    { key: "data/members.json", local: "src/data/members.json" },
    { key: "data/projects.json", local: "src/data/projects.json" },
    { key: "data/sponsors.json", local: "src/data/sponsors.json" },
    { key: "data/achievements.json", local: "public/achievements/captions.json" },
    { key: "data/stories.json", local: "public/stories/captions.json" },
  ];

  for (const item of JSON_FILES) {
    const fullPath = path.join(process.cwd(), item.local);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, "utf-8");
    process.stdout.write(`  Uploading ${item.key}... `);
    try {
      await put(item.key, content, {
        access,
        allowOverwrite: true,
        contentType: "application/json",
        token,
      });
      console.log(`\x1b[32m✓\x1b[0m`);
    } catch (err) {
      console.log(`\x1b[31m✗ (${err.message})\x1b[0m`);
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   Total assets uploaded: ${fileCount}`);
  console.log(`   Total size: ${(bytesCount / 1024 / 1024).toFixed(2)} MB\n`);
}

migrate().catch(console.error);
