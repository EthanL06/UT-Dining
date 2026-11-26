import type { NextConfig } from 'next';

const basePath = process.env.WEBSITE_BASE_PATH ?? '/ut-dining-website';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
