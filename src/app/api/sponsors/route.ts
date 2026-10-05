import path from "path";
import { readJsonData } from "@/lib/admin-files";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/sponsors.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "sponsors.json");

export interface SponsorEntry {
  id: string;
  src: string;
  alt: string;
}

export async function GET() {
  const sponsors = await readJsonData<SponsorEntry[]>(BLOB_KEY, DATA_PATH, []);
  return Response.json(sponsors);
}
