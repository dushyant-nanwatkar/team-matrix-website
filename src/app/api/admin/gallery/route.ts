import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, saveUploadedImage, deletePublicFile, readJsonData, writeJsonData } from "@/lib/admin-files";
import { normalizeStories, getInitialLocalStories } from "@/lib/stories";
import { isSameAsset } from "@/lib/asset-url";
import type { WorkItem } from "@/data/works";

async function loadStories(): Promise<WorkItem[]> {
  const items = normalizeStories(await readJsonData<unknown>(BLOB_KEY, DATA_PATH, []));
  return items.length > 0 ? items : getInitialLocalStories();
}

const BLOB_KEY = "data/stories.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "stories.json");

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const file = form.get("image");
  const title = String(form.get("title") ?? "").trim();
  const story = String(form.get("story") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "An image file is required" }, { status: 400 });
  }

  let urlPath: string;
  try {
    urlPath = await saveUploadedImage(file, "stories");
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }

  const items = await loadStories();

  const newItem: WorkItem = {
    id: crypto.randomBytes(6).toString("hex"),
    img: urlPath,
    url: "#",
    title: title || undefined,
    story: story || undefined,
  };

  items.unshift(newItem);
  await writeJsonData(BLOB_KEY, DATA_PATH, items);

  return NextResponse.json({ ok: true, img: urlPath, item: newItem });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const img = String(form.get("img") ?? "").trim();
  const file = form.get("image");
  const title = String(form.get("title") ?? "").trim();
  const story = String(form.get("story") ?? "").trim();

  if (!img) {
    return NextResponse.json({ ok: false, error: "Missing or invalid img" }, { status: 400 });
  }

  const items = await loadStories();

  const target = items.find((i) => isSameAsset(i.img, img));
  if (!target) {
    return NextResponse.json({ ok: false, error: "Story item not found" }, { status: 404 });
  }

  if (form.has("title")) target.title = title || undefined;
  if (form.has("story")) target.story = story || undefined;

  if (file instanceof File && file.size > 0) {
    let newUrlPath: string;
    try {
      newUrlPath = await saveUploadedImage(file, "stories");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
    await deletePublicFile(target.img);
    target.img = newUrlPath;
  }

  await writeJsonData(BLOB_KEY, DATA_PATH, items);
  return NextResponse.json({ ok: true, img: target.img, item: target });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const img = searchParams.get("img");
  if (!img) {
    return NextResponse.json({ ok: false, error: "Missing or invalid img" }, { status: 400 });
  }

  let items = await loadStories();

  const target = items.find((i) => isSameAsset(i.img, img));
  if (target) {
    await deletePublicFile(target.img);
    items = items.filter((i) => i !== target);
    await writeJsonData(BLOB_KEY, DATA_PATH, items);
  }

  return NextResponse.json({ ok: true });
}
