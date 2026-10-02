import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, saveUploadedImage, deletePublicFile, readJsonFile, writeJsonFile } from "@/lib/admin-files";

const DATA_PATH = path.join(process.cwd(), "public", "achievements", "captions.json");

interface AchievementRawEntry {
  id?: string;
  file: string;
  caption: string;
  note?: string;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const rawList = readJsonFile<AchievementRawEntry[]>(DATA_PATH, []);
  const items = rawList.map((item, idx) => {
    const file = item.file || "";
    const image = file.startsWith("/") ? file : `/achievements/${file}`;
    return {
      id: item.id || `ach-${idx + 1}`,
      file,
      caption: item.caption || "",
      note: item.note,
      image,
    };
  });

  return NextResponse.json({ ok: true, achievements: items });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const file = form.get("image");
  const caption = String(form.get("caption") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "An image file is required" }, { status: 400 });
  }
  if (!caption) {
    return NextResponse.json({ ok: false, error: "A caption is required" }, { status: 400 });
  }

  let urlPath: string;
  try {
    urlPath = await saveUploadedImage(file, "achievements");
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }

  const filename = path.basename(urlPath);
  const items = readJsonFile<AchievementRawEntry[]>(DATA_PATH, []);
  const id = `ach-${crypto.randomBytes(4).toString("hex")}`;
  const entry: AchievementRawEntry = {
    id,
    file: filename,
    caption,
    ...(note ? { note } : {}),
  };

  items.push(entry);
  writeJsonFile(DATA_PATH, items);

  return NextResponse.json({
    ok: true,
    achievement: {
      ...entry,
      image: `/achievements/${filename}`,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const id = String(form.get("id") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const file = form.get("image");

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing achievement id" }, { status: 400 });
  }

  const items = readJsonFile<AchievementRawEntry[]>(DATA_PATH, []);
  const target = items.find((item, idx) => item.id === id || (!item.id && `ach-${idx + 1}` === id) || item.file === id);

  if (!target) {
    return NextResponse.json({ ok: false, error: "Achievement not found" }, { status: 404 });
  }

  if (caption) {
    target.caption = caption;
  }

  if (form.has("note")) {
    if (note) {
      target.note = note;
    } else {
      delete target.note;
    }
  }

  if (file instanceof File && file.size > 0) {
    let newUrlPath: string;
    try {
      newUrlPath = await saveUploadedImage(file, "achievements");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }

    const oldFilePath = target.file.startsWith("/") ? target.file : `/achievements/${target.file}`;
    deletePublicFile(oldFilePath);
    target.file = path.basename(newUrlPath);
  }

  // Ensure item has an id
  if (!target.id) {
    target.id = id;
  }

  writeJsonFile(DATA_PATH, items);

  return NextResponse.json({
    ok: true,
    achievement: {
      ...target,
      image: target.file.startsWith("/") ? target.file : `/achievements/${target.file}`,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const items = readJsonFile<AchievementRawEntry[]>(DATA_PATH, []);
  const index = items.findIndex((item, idx) => item.id === id || (!item.id && `ach-${idx + 1}` === id) || item.file === id);

  if (index === -1) {
    return NextResponse.json({ ok: false, error: "Achievement not found" }, { status: 404 });
  }

  const target = items[index];
  const oldFilePath = target.file.startsWith("/") ? target.file : `/achievements/${target.file}`;
  deletePublicFile(oldFilePath);

  items.splice(index, 1);
  writeJsonFile(DATA_PATH, items);

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const order: string[] = body.order;
    if (!Array.isArray(order)) {
      return NextResponse.json({ ok: false, error: "Invalid order array" }, { status: 400 });
    }

    const items = readJsonFile<AchievementRawEntry[]>(DATA_PATH, []);
    const itemMap = new Map<string, AchievementRawEntry>();

    items.forEach((item, idx) => {
      const key = item.id || `ach-${idx + 1}`;
      itemMap.set(key, item);
      itemMap.set(item.file, item);
    });

    const reordered: AchievementRawEntry[] = [];
    const seen = new Set<AchievementRawEntry>();

    for (const key of order) {
      const match = itemMap.get(key);
      if (match && !seen.has(match)) {
        seen.add(match);
        reordered.push(match);
      }
    }

    // Append any remaining items that weren't in order array
    for (const item of items) {
      if (!seen.has(item)) {
        reordered.push(item);
      }
    }

    writeJsonFile(DATA_PATH, reordered);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
