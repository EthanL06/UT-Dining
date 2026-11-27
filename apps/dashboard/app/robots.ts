import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isStatusHost, STATUS_SITE_URL } from '@/lib/status/site';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host');

  if (isStatusHost(host)) {
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/login', '/auth/'] },
      sitemap: `${STATUS_SITE_URL}/sitemap.xml`,
      host: STATUS_SITE_URL,
    };
  }

  return { rules: { userAgent: '*', disallow: '/' } };
}
