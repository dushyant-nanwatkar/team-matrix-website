import path from "path";
import { NextResponse } from "next/server";
import { readJsonData } from "@/lib/admin-files";
import type { ProjectItem } from "@/data/projects";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/projects.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "projects.json");

export async function GET() {
  const projects = await readJsonData<ProjectItem[]>(BLOB_KEY, DATA_PATH, []);
  return NextResponse.json({ ok: true, projects });
}
