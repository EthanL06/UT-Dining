import { compareVersions } from '@ut-dining/core';
import fallback from '@/content/changelog.json';
import { log } from '@/lib/log';

export type ChangelogChange = {
  icon?: string;
  title: string;
  description?: string;
};

export type ChangelogEntry = {
  version: string;
  release_date: string | null;
  summary: string | null;
  changes: ChangelogChange[];
};

export const CHANGELOG_REVALIDATE_SECONDS = 300;

export type ChangelogSource = { url: string; key: string } | null;

export function changelogSource(): ChangelogSource {
  const url = process.env.WEBSITE_SUPABASE_URL;
  const key = process.env.WEBSITE_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export async function fetchPublished(source: ChangelogSource): Promise<ChangelogEntry[] | null> {
  if (!source) return null;
  const { url, key } = source;
  try {
    const res = await fetch(
      `${url}/rest/v1/changelog?select=version,release_date,summary,changes&is_published=eq.true`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: CHANGELOG_REVALIDATE_SECONDS, tags: ['changelog'] },
      },
    );
    if (!res.ok) {
      log.warn(`Changelog fetch failed with ${res.status}, using content/changelog.json`);
      return null;
    }
    const rows = (await res.json()) as ChangelogEntry[];
    return rows.length > 0 ? rows : null;
  } catch (error) {
    log.warn('Changelog fetch failed, using content/changelog.json', error);
    return null;
  }
}

export function sortEntries(entries: ChangelogEntry[]) {
  return [...entries].sort((a, b) => compareVersions(b.version, a.version));
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  return sortEntries((await fetchPublished(changelogSource())) ?? (fallback as ChangelogEntry[]));
}

export function formatReleaseDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
