import fs from "fs";
import path from "path";
import type { WorkItem } from "@/data/works";
import { readJsonData } from "@/lib/admin-files";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/stories.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "stories.json");

export function getInitialLocalStories(): WorkItem[] {
  const storiesDir = path.join(process.cwd(), "public", "stories");
  const captionsPath = path.join(storiesDir, "captions.json");
  const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

  let files: string[] = [];
  try {
    files = fs
      .readdirSync(storiesDir)
      .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .sort();
  } catch {
    return [];
  }

  let captions: Record<string, { title?: string; story?: string }> = {};
  try {
    captions = JSON.parse(fs.readFileSync(captionsPath, "utf-8"));
  } catch {
    captions = {};
  }

  return files.map((filename, idx) => {
    const entry = captions[filename];
    const base = path.basename(filename, path.extname(filename));
    const derivedTitle = base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      id: String(idx + 1),
      img: `/stories/${filename}`,
      url: "#",
      title: entry?.title || derivedTitle,
      story: entry?.story,
    };
  });
}

export async function GET() {
  const items = await readJsonData<WorkItem[]>(BLOB_KEY, DATA_PATH, []);
  if (!items || items.length === 0) {
    const initial = getInitialLocalStories();
    return Response.json(initial);
  }
  return Response.json(items);
}
