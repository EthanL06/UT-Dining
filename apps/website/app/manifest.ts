import type { MetadataRoute } from 'next';
import { asset, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: asset('/'),
    scope: asset('/'),
    display: 'browser',
    background_color: '#f2f2f7',
    theme_color: '#bf5700',
    icons: [
      { src: asset('/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: asset('/icon-512.png'), sizes: '512x512', type: 'image/png' },
      {
        src: asset('/icon-512-maskable.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
