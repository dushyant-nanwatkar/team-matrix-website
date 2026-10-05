// Client-safe asset URL helper for routing images and 3D models through Vercel Blob view route

export function getAssetUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("/api/avatar/view")
  ) {
    return pathOrUrl;
  }
  // Strip leading slash(es)
  const clean = pathOrUrl.replace(/^\/+/, "");
  return `/api/avatar/view?pathname=${encodeURIComponent(clean)}`;
}
