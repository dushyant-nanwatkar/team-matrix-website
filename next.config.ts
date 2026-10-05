import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Blob migration route reads local assets with `fs`. On Vercel, files in
  // /public are served by the CDN and are NOT available inside serverless
  // functions unless explicitly traced, so bundle them into that route only.
  outputFileTracingIncludes: {
    "/api/admin/migrate": [
      "./public/{members,alumni,sponsors,stories,achievements,projects}/**/*",
      "./public/objects/*.{glb,gltf,mtl}",
      "./src/data/*.json",
    ],
    "/api/avatar/view": [
      "./public/{members,alumni,sponsors,stories,achievements,projects}/**/*",
      "./public/objects/*.{glb,gltf,mtl}",
    ],
  },
  outputFileTracingExcludes: {
    // Raw .obj models are huge (100MB+) and gitignored — never bundle them.
    "/api/admin/migrate": ["./public/objects/*.obj", "./public/tempfiles/**/*"],
    "/api/avatar/view": ["./public/objects/*.obj", "./public/tempfiles/**/*"],
  },
  images: {
    // AVIF first (smaller than WebP when the browser supports it), WebP as
    // the fallback — every image on the site is served through next/image,
    // so this affects the whole site's image payload.
    formats: ["image/avif", "image/webp"],
    // All images are local static assets under /public — they only change
    // on a new deploy, so the optimizer's cache can safely be long-lived
    // instead of the 60s default.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
