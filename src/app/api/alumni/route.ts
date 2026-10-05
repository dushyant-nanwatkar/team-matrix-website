import path from "path";
import { readJsonData, getAssetUrl } from "@/lib/admin-files";
import { ALUMNI, type Alumnus } from "@/data/alumni";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/alumni.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "alumni.json");

export async function GET() {
  const alumni = await readJsonData<Alumnus[]>(BLOB_KEY, DATA_PATH, ALUMNI);
  const mapped = alumni.map((a) => ({
    ...a,
    avatarUrl: getAssetUrl(a.avatarUrl),
  }));
  return Response.json(mapped);
}
