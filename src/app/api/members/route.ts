import path from "path";
import type { Member } from "@/data/members";
import { readJsonData } from "@/lib/admin-files";

export const dynamic = "force-dynamic";

const DATA_PATH = path.join(process.cwd(), "src", "data", "members.json");

export async function GET() {
  const members = await readJsonData<Member[]>("data/members.json", DATA_PATH, []);
  return Response.json(members);
}
