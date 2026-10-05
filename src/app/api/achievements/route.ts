import path from "path";
import { readJsonData } from "@/lib/admin-files";
import { resolveAchievementImage } from "@/lib/asset-url";

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
    const image = resolveAchievementImage(file);

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
