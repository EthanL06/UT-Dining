import type { MetadataRoute } from 'next';
import { getChangelog } from '@/lib/changelog';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [latest] = await getChangelog();
  const changelogDate = latest?.release_date ? new Date(latest.release_date) : undefined;
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    {
      url: absoluteUrl('/changelog/'),
      lastModified: changelogDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/privacy-policy/'),
      lastModified: new Date('2025-07-27'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
