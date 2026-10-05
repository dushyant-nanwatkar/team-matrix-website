import path from "path";
import { NextResponse } from "next/server";
import { readJsonData, getAssetUrl } from "@/lib/admin-files";
import type { ProjectItem } from "@/data/projects";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/projects.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "projects.json");

export async function GET() {
  const projects = await readJsonData<ProjectItem[]>(BLOB_KEY, DATA_PATH, []);
  const mapped = projects.map((p) => ({
    ...p,
    modelUrl: getAssetUrl(p.modelUrl),
    mtlUrl: p.mtlUrl ? getAssetUrl(p.mtlUrl) : undefined,
    previewImage: p.previewImage ? getAssetUrl(p.previewImage) : undefined,
  }));
  return NextResponse.json({ ok: true, projects: mapped });
}
