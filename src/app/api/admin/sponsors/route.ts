import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, saveUploadedImage, deletePublicFile, readJsonData, writeJsonData } from "@/lib/admin-files";
import type { SponsorEntry } from "@/app/api/sponsors/route";

const BLOB_KEY = "data/sponsors.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "sponsors.json");

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const file = form.get("logo");
  const alt = String(form.get("alt") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "A logo image is required" }, { status: 400 });
  }
  if (!alt) {
    return NextResponse.json({ ok: false, error: "A sponsor name is required" }, { status: 400 });
  }

  let src: string;
  try {
    src = await saveUploadedImage(file, "sponsors");
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }

  const sponsors = await readJsonData<SponsorEntry[]>(BLOB_KEY, DATA_PATH, []);
  const entry: SponsorEntry = { id: crypto.randomBytes(6).toString("hex"), src, alt };
  sponsors.push(entry);
  await writeJsonData(BLOB_KEY, DATA_PATH, sponsors);

  return NextResponse.json({ ok: true, sponsor: entry });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const file = form.get("logo");
  const alt = String(form.get("alt") ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const sponsors = await readJsonData<SponsorEntry[]>(BLOB_KEY, DATA_PATH, []);
  const target = sponsors.find((s) => s.id === id);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Sponsor not found" }, { status: 404 });
  }

  if (alt) target.alt = alt;

  if (file instanceof File && file.size > 0) {
    let newSrc: string;
    try {
      newSrc = await saveUploadedImage(file, "sponsors");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
    await deletePublicFile(target.src);
    target.src = newSrc;
  }

  await writeJsonData(BLOB_KEY, DATA_PATH, sponsors);
  return NextResponse.json({ ok: true, sponsor: target });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const sponsors = await readJsonData<SponsorEntry[]>(BLOB_KEY, DATA_PATH, []);
  const target = sponsors.find((s) => s.id === id);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Sponsor not found" }, { status: 404 });
  }

  await deletePublicFile(target.src);
  await writeJsonData(
    BLOB_KEY,
    DATA_PATH,
    sponsors.filter((s) => s.id !== id)
  );

  return NextResponse.json({ ok: true });
}
