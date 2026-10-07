// Client-safe asset URL helpers for routing images and 3D models through the
// Vercel Blob view route. Safe to import from both server and "use client" code.

// Resolves any stored asset reference (local "/members/x.webp", bare
// "members/x.webp", a blob view URL, or an absolute URL) into a URL the
// browser can load. Relative paths are served from Vercel Blob via
// /api/avatar/view, which falls back to /public when Blob isn't configured.
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

// Normalises any stored asset reference into its Blob pathname
// (e.g. "stories/abc.webp"). Used to compare references that may be stored in
// different forms, and to delete the underlying blob.
export function toStoragePathname(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  try {
    if (pathOrUrl.includes("/api/avatar/view")) {
      const u = new URL(pathOrUrl, "http://localhost");
      const p = u.searchParams.get("pathname") || "";
      return decodeURIComponent(p).replace(/^\/+/, "");
    }
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      return decodeURIComponent(new URL(pathOrUrl).pathname).replace(/^\/+/, "");
    }
  } catch {
    // fall through to plain-path handling
  }
  return pathOrUrl.split("?")[0].replace(/^\/+/, "");
}

// True when two stored references point at the same underlying asset.
export function isSameAsset(a?: string | null, b?: string | null): boolean {
  const pa = toStoragePathname(a);
  return Boolean(pa) && pa === toStoragePathname(b);
}

// Achievement entries historically store a bare filename ("photo.jpg") that
// lives under achievements/, but newer uploads store a full view URL.
export function resolveAchievementImage(file?: string | null): string {
  if (!file) return "";
  if (
    file.startsWith("http://") ||
    file.startsWith("https://") ||
    file.startsWith("/api/avatar/view")
  ) {
    return file;
  }
  const clean = file.replace(/^\/+/, "");
  return getAssetUrl(clean.includes("/") ? clean : `achievements/${clean}`);
}
