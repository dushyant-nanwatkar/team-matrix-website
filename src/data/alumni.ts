import { getAssetUrl } from "@/lib/asset-url";

export interface Alumnus {
  id: string;
  name: string;
  /** Company/org they're at now, shown as their current role */
  currentOrg: string;
  /** Graduation batch, e.g. "2021-2025" */
  batch: string;
  /** Path to photo in /public/alumni/ or Blob URL */
  avatarUrl: string;
}

export const ALUMNI: Alumnus[] = [
  {
    id: "shivam-ganmote",
    name: "Shivam Ganmote",
    currentOrg: "Muks Robotics",
    batch: "2021-2025",
    avatarUrl: getAssetUrl("/alumni/h7zxeqgdbujzdhxsuwjt.webp"),
  },
  {
    id: "kunal-bhangale",
    name: "Kunal Bhangale",
    currentOrg: "Luna Technologies",
    batch: "2021-2025",
    avatarUrl: getAssetUrl("/alumni/dv7adx3yfq6h5tgabsnx.webp"),
  },
  {
    id: "hitesh-waykole",
    name: "Hitesh Waykole",
    currentOrg: "Black Coffee Robotics",
    batch: "2021-2025",
    avatarUrl: getAssetUrl("/alumni/wdbpxlllkfm1w2dk9ksx.webp"),
  },
  {
    id: "jithin-puthur",
    name: "Jithin Puthur",
    currentOrg: "Manastu Space",
    batch: "2022-2026",
    avatarUrl: getAssetUrl("/alumni/b0qx2jkfndhcutjuik39.webp"),
  },
  {
    id: "tanmay-gajkal",
    name: "Tanmay Gajkal",
    currentOrg: "Saakar Robotics",
    batch: "2022-2026",
    avatarUrl: getAssetUrl("/alumni/cavydhlka1f53o7xgnb1.webp"),
  },
  {
    id: "devyani-amrutkar",
    name: "Devyani Amrutkar",
    currentOrg: "Saakar Robotics",
    batch: "2022-2026",
    avatarUrl: getAssetUrl("/alumni/mbpzzafcaakjdvozrygn.webp"),
  },
  {
    id: "pranav-bacchav",
    name: "Pranav Bacchav",
    currentOrg: "Alaric Design",
    batch: "2022-2026",
    avatarUrl: getAssetUrl("/alumni/c8lzund5mrugavd0vubs.webp"),
  },
];
