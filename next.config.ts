import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    dashboard: {
      stale: 60,
      revalidate: 600,
      expire: 3600,
    },
  },
};

export default nextConfig;
