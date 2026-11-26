import fallback from '@/content/changelog.json';

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

function compareVersions(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function fetchPublished(): Promise<ChangelogEntry[] | null> {
  const url = process.env.WEBSITE_SUPABASE_URL;
  const key = process.env.WEBSITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/changelog?select=version,release_date,summary,changes&is_published=eq.true`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.warn(`Changelog fetch failed with ${res.status}, using content/changelog.json`);
      return null;
    }
    const rows = (await res.json()) as ChangelogEntry[];
    return rows.length > 0 ? rows : null;
  } catch (error) {
    console.warn('Changelog fetch failed, using content/changelog.json', error);
    return null;
  }
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  const entries = (await fetchPublished()) ?? (fallback as ChangelogEntry[]);
  return [...entries].sort((a, b) => compareVersions(a.version, b.version));
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
