import fs from "fs";
import path from "path";
import type { WorkItem } from "@/data/works";

// Server-only helpers for the "Our Stories" gallery dataset (data/stories.json).

type CaptionMap = Record<string, { title?: string; story?: string }>;

function titleFromFilename(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Converts the legacy public/stories/captions.json shape (an object keyed by
// filename) into the WorkItem[] shape the site and admin panel use.
export function captionsMapToStories(captions: CaptionMap): WorkItem[] {
  return Object.keys(captions)
    .sort()
    .map((filename, idx) => ({
      id: String(idx + 1),
      img: `/stories/${filename}`,
      url: "#",
      title: captions[filename]?.title || titleFromFilename(filename),
      story: captions[filename]?.story,
    }));
}

// data/stories.json may contain either WorkItem[] (written by the admin panel)
// or the legacy captions map (copied as-is by the first Blob migration).
export function normalizeStories(raw: unknown): WorkItem[] {
  if (Array.isArray(raw)) return raw as WorkItem[];
  if (raw && typeof raw === "object") return captionsMapToStories(raw as CaptionMap);
  return [];
}

// Local-dev fallback: build the list from files in /public/stories.
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

  let captions: CaptionMap = {};
  try {
    captions = JSON.parse(fs.readFileSync(captionsPath, "utf-8"));
  } catch {
    captions = {};
  }

  return files.map((filename, idx) => ({
    id: String(idx + 1),
    img: `/stories/${filename}`,
    url: "#",
    title: captions[filename]?.title || titleFromFilename(filename),
    story: captions[filename]?.story,
  }));
}
