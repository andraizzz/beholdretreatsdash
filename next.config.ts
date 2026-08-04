import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    dashboard: {
      stale: 60,
      revalidate: 600,
      expire: 3600,
    },
    weekly: {
      stale: 3600,
      revalidate: 604800,
      expire: 2592000,
    },
  },
};

export default nextConfig;
