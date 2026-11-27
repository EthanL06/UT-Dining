import type { NextConfig } from 'next';

const staticExport = process.env.WEBSITE_STATIC_EXPORT === '1';
const basePath = process.env.WEBSITE_BASE_PATH ?? (staticExport ? '/ut-dining-website' : '');

const nextConfig: NextConfig = {
  ...(staticExport ? { output: 'export' as const, images: { unoptimized: true } } : {}),
  basePath,
  trailingSlash: true,
  poweredByHeader: false,
  transpilePackages: ['@ut-dining/core'],
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
