import path from "path";
import { readJsonData, getAssetUrl } from "@/lib/admin-files";

export const dynamic = "force-dynamic";

const BLOB_KEY = "data/achievements.json";
const DATA_PATH = path.join(process.cwd(), "public", "achievements", "captions.json");

export interface AchievementItem {
  id: string;
  file: string;
  caption: string;
  note?: string;
  image: string;
}

export async function GET() {
  const list = await readJsonData<Array<{ id?: string; file: string; caption: string; note?: string }>>(
    BLOB_KEY,
    DATA_PATH,
    []
  );

  const items: AchievementItem[] = list.map((item, index) => {
    const file = item.file || "";
    const clean = file.replace(/^\/+/, "");
    const pathname = clean.startsWith("achievements/") ? clean : `achievements/${clean}`;
    const image = getAssetUrl(file.startsWith("http://") || file.startsWith("https://") ? file : pathname);

    return {
      id: item.id || `ach-${index + 1}`,
      file,
      caption: item.caption || "",
      ...(item.note ? { note: item.note } : {}),
      image,
    };
  });

  return Response.json(items);
}
