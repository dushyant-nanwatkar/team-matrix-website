import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
