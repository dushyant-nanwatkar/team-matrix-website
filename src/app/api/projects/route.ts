import path from "path";
import { NextResponse } from "next/server";
import { readJsonFile } from "@/lib/admin-files";
import type { ProjectItem } from "@/data/projects";

const DATA_PATH = path.join(process.cwd(), "src", "data", "projects.json");

export async function GET() {
  const projects = readJsonFile<ProjectItem[]>(DATA_PATH, []);
  return NextResponse.json({ ok: true, projects });
}
