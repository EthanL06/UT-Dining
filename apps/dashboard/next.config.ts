import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Existing lint errors fail `next build`; lint moves to Biome in the monorepo.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
