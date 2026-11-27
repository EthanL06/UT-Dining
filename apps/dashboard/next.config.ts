import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ut-dining/core', '@ut-dining/supabase'],
  async headers() {
    return [
      {
        source: '/:path*',
        missing: [{ type: 'host', value: 'status\\..*' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;
