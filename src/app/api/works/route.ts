import path from "path";
import { readJsonData, getAssetUrl } from "@/lib/admin-files";
import { normalizeStories, getInitialLocalStories } from "@/lib/stories";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/stories.json";
const DATA_PATH = path.join(process.cwd(), "src", "data", "stories.json");

export async function GET() {
  const raw = await readJsonData<unknown>(BLOB_KEY, DATA_PATH, []);
  const items = normalizeStories(raw);
  const list = items.length === 0 ? getInitialLocalStories() : items;
  const mapped = list.map((w) => ({
    ...w,
    img: getAssetUrl(w.img),
  }));
  return Response.json(mapped);
}
