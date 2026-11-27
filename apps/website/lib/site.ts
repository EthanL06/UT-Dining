import { DEFAULT_STATUS_API_URL, STATUS_PAGE_URL } from '@ut-dining/core';

export const APP_STORE_ID = '6743042002';
export const APP_STORE_URL = `https://apps.apple.com/us/app/ut-dining/id${APP_STORE_ID}`;
export const GITHUB_URL = 'https://github.com/EthanL06/UT-Dining';
export const STATUS_URL = STATUS_PAGE_URL;
export const STATUS_API_URL = process.env.NEXT_PUBLIC_STATUS_API_URL ?? DEFAULT_STATUS_API_URL;
export const SITE_NAME = 'UT Dining';
export const SITE_DESCRIPTION =
  'Menus, hours, nutrition and a campus map for every dining hall, café, market and food truck at UT Austin. Free for iPhone.';

function siteUrl() {
  const explicit = process.env.WEBSITE_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export const SITE_URL = siteUrl();

export function asset(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
}

export function absoluteUrl(path: string) {
  return `${SITE_URL}${asset(path)}`;
}

export function ogImages() {
  return [{ url: absoluteUrl('/og.png'), width: 1200, height: 630, alt: OG_ALT }];
}

export const OG_ALT = 'UT Dining: menus and hours for every place to eat at UT Austin';

export function pageMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description: string;
  path: string;
}) {
  const url = absoluteUrl(path);
  const fullTitle = title ? `${title} · ${SITE_NAME}` : undefined;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website' as const,
      siteName: SITE_NAME,
      locale: 'en_US',
      url,
      description,
      images: ogImages(),
      ...(fullTitle ? { title: fullTitle } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      description,
      images: ogImages(),
      ...(fullTitle ? { title: fullTitle } : {}),
    },
  };
}
