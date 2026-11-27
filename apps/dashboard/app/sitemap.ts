import type { MetadataRoute } from 'next';
import { STATUS_SITE_URL } from '@/lib/status/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: STATUS_SITE_URL, changeFrequency: 'hourly', priority: 1 }];
}
