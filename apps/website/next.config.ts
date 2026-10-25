import type { NextConfig } from 'next';

// Published as a static site to GitHub Pages at https://longhorn-developers.github.io/ut-dining-website/.
// The App Store privacy-policy link points at that URL, so keep the base path unless the site moves.
const basePath = process.env.WEBSITE_BASE_PATH ?? '/ut-dining-website';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  // Emit about/index.html instead of about.html: Next 16 also writes an about/ folder of RSC data,
  // which would shadow about.html on a static host.
  trailingSlash: true,
};

export default nextConfig;
