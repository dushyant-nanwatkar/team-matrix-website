import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  saveUploadedImage,
  saveUploadedModelFile,
  deletePublicFile,
  readJsonData,
  writeJsonData,
  listPublicObjectFiles,
} from "@/lib/admin-files";
import type { ProjectItem, ProjectStat } from "@/data/projects";

const BLOB_KEY = "data/projects.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "projects.json");

export async function GET(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const projects = await readJsonData<ProjectItem[]>(BLOB_KEY, DATA_PATH, []);
  const availableFiles = await listPublicObjectFiles();

  return NextResponse.json({ ok: true, projects, availableFiles });
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "Robotics").trim();
  const year = String(form.get("year") ?? new Date().getFullYear().toString()).trim();
  const featured = form.get("featured") === "true";

  let modelUrl = String(form.get("modelUrl") ?? "").trim();
  let mtlUrl = String(form.get("mtlUrl") ?? "").trim();
  let previewImage = String(form.get("previewImage") ?? "").trim();

  const modelFile = form.get("modelFile");
  const mtlFile = form.get("mtlFile");
  const previewFile = form.get("previewFile");

  if (!title) {
    return NextResponse.json({ ok: false, error: "Project title is required" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ ok: false, error: "Project description is required" }, { status: 400 });
  }

  // Handle model file upload if provided
  if (modelFile instanceof File && modelFile.size > 0) {
    try {
      modelUrl = await saveUploadedModelFile(modelFile, "objects");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  if (!modelUrl) {
    return NextResponse.json(
      { ok: false, error: "Please either upload an OBJ/GLB file or select an existing 3D model" },
      { status: 400 }
    );
  }

  // Handle MTL file upload if provided
  if (mtlFile instanceof File && mtlFile.size > 0) {
    try {
      mtlUrl = await saveUploadedModelFile(mtlFile, "objects");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  // Handle preview image upload if provided
  if (previewFile instanceof File && previewFile.size > 0) {
    try {
      previewImage = await saveUploadedImage(previewFile, "projects");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  // Parse tags
  const tagsRaw = String(form.get("tags") ?? "");
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Parse stats
  let stats: ProjectStat[] = [];
  const statsRaw = form.get("stats");
  if (typeof statsRaw === "string" && statsRaw.trim()) {
    try {
      stats = JSON.parse(statsRaw);
    } catch {
      // fallback
    }
  }

  const id =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || crypto.randomBytes(4).toString("hex");

  const projects = await readJsonData<ProjectItem[]>(BLOB_KEY, DATA_PATH, []);

  // Ensure unique ID
  let uniqueId = id;
  let counter = 1;
  while (projects.some((p) => p.id === uniqueId)) {
    uniqueId = `${id}-${counter++}`;
  }

  const newProject: ProjectItem = {
    id: uniqueId,
    title,
    category,
    description,
    year,
    modelUrl,
    mtlUrl: mtlUrl || undefined,
    previewImage: previewImage || undefined,
    tags: tags.length ? tags : undefined,
    stats: stats.length ? stats : undefined,
    featured,
    createdAt: new Date().toISOString(),
  };

  projects.unshift(newProject);
  await writeJsonData(BLOB_KEY, DATA_PATH, projects);

  return NextResponse.json({ ok: true, project: newProject });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const form = await request.formData();
  const id = String(form.get("id") ?? "");

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing project id" }, { status: 400 });
  }

  const projects = await readJsonData<ProjectItem[]>(BLOB_KEY, DATA_PATH, []);
  const target = projects.find((p) => p.id === id);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  if (form.has("title")) target.title = String(form.get("title") ?? target.title).trim();
  if (form.has("description")) target.description = String(form.get("description") ?? target.description).trim();
  if (form.has("category")) target.category = String(form.get("category") ?? target.category).trim();
  if (form.has("year")) target.year = String(form.get("year") ?? target.year).trim();
  if (form.has("featured")) target.featured = form.get("featured") === "true";

  if (form.has("modelUrl")) {
    const rawUrl = String(form.get("modelUrl") ?? "").trim();
    if (rawUrl) target.modelUrl = rawUrl;
  }
  if (form.has("mtlUrl")) {
    const rawUrl = String(form.get("mtlUrl") ?? "").trim();
    target.mtlUrl = rawUrl || undefined;
  }

  const modelFile = form.get("modelFile");
  if (modelFile instanceof File && modelFile.size > 0) {
    try {
      target.modelUrl = await saveUploadedModelFile(modelFile, "objects");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  const mtlFile = form.get("mtlFile");
  if (mtlFile instanceof File && mtlFile.size > 0) {
    try {
      target.mtlUrl = await saveUploadedModelFile(mtlFile, "objects");
    } catch (err) {
      return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
    }
  }

  const removePreview = form.get("removePreviewImage") === "true";
  if (removePreview) {
    if (target.previewImage) {
      await deletePublicFile(target.previewImage);
    }
    target.previewImage = undefined;
  } else {
    const previewFile = form.get("previewFile");
    if (previewFile instanceof File && previewFile.size > 0) {
      try {
        if (target.previewImage) {
          await deletePublicFile(target.previewImage);
        }
        target.previewImage = await saveUploadedImage(previewFile, "projects");
      } catch (err) {
        return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
      }
    } else if (form.has("previewImage")) {
      const rawUrl = String(form.get("previewImage") ?? "").trim();
      target.previewImage = rawUrl || undefined;
    }
  }

  if (form.has("tags")) {
    const tagsRaw = String(form.get("tags") ?? "");
    target.tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
  }

  if (form.has("stats")) {
    try {
      const parsed = JSON.parse(String(form.get("stats") ?? "[]"));
      target.stats = Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
    } catch {
      // ignore
    }
  }

  await writeJsonData(BLOB_KEY, DATA_PATH, projects);
  return NextResponse.json({ ok: true, project: target });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = requireAuth(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing project id" }, { status: 400 });
  }

  const projects = await readJsonData<ProjectItem[]>(BLOB_KEY, DATA_PATH, []);
  const target = projects.find((p) => p.id === id);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  // If previewImage exists, clean it up
  if (target.previewImage) {
    await deletePublicFile(target.previewImage);
  }

  const remaining = projects.filter((p) => p.id !== id);
  await writeJsonData(BLOB_KEY, DATA_PATH, remaining);

  return NextResponse.json({ ok: true });
}
