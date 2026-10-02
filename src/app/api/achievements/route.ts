import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic"; // always re-read file on each request

const DATA_PATH = path.join(process.cwd(), "public", "achievements", "captions.json");

export interface AchievementItem {
  id: string;
  file: string;
  caption: string;
  note?: string;
  image: string;
}

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const list = JSON.parse(raw) as Array<{ id?: string; file: string; caption: string; note?: string }>;
    const items: AchievementItem[] = list.map((item, index) => {
      const file = item.file || "";
      const image = file.startsWith("/") ? file : `/achievements/${file}`;
      return {
        id: item.id || `ach-${index + 1}`,
        file,
        caption: item.caption || "",
        ...(item.note ? { note: item.note } : {}),
        image,
      };
    });
    return Response.json(items);
  } catch {
    return Response.json([]);
  }
}
