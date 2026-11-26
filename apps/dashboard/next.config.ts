import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ut-dining/core', '@ut-dining/supabase'],
};

export default nextConfig;
