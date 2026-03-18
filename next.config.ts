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
    unoptimized: true,
  },
};

export default nextConfig;
