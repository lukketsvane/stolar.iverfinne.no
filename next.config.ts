import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "framemark.vam.ac.uk" },
      { protocol: "https", hostname: "dms01.dimu.org" },
      { protocol: "https", hostname: "ms01.nasjonalmuseet.no" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "images.metmuseum.org" },
      { protocol: "https", hostname: "images.collection.cooperhewitt.org" },
    ],
    // Vercel optimizes + caches images at edge. Small tiles get tiny WebP thumbnails.
    deviceSizes: [96, 192, 384, 640, 1080],
    imageSizes: [48, 64, 96, 128, 192, 256],
  },
};

export default nextConfig;
