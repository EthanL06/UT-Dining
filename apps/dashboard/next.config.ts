import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@ut-dining/core', '@ut-dining/supabase'],
};

export default nextConfig;
