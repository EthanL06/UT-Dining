import {
  keepOpenPreviews,
  openPullRequestsUrl,
  PR_PAGE_SIZE,
  type PrPreview,
  parseOpenPrNumbers,
  parsePreviews,
  previewsUrl,
} from '~/utils/previews';

export const PR_PREVIEWS_QUERY_KEY = ['qaPrPreviews'] as const;

const MAX_PR_PAGES = 5;

const fetchPreviewIndex = async (): Promise<PrPreview[]> => {
  const url = previewsUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (!url) throw new Error('No Supabase URL in this build.');
  const response = await fetch(`${url}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (response.status === 400 || response.status === 404) return [];
  if (!response.ok) throw new Error(`Preview list returned ${response.status}`);
  return parsePreviews(await response.json());
};

const fetchOpenPrNumbers = async (): Promise<Set<number> | null> => {
  const open = new Set<number>();
  for (let page = 1; page <= MAX_PR_PAGES; page += 1) {
    const response = await fetch(openPullRequestsUrl(page), {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return null;
    const numbers = parseOpenPrNumbers(await response.json());
    if (!numbers) return null;
    for (const number of numbers) open.add(number);
    if (numbers.length < PR_PAGE_SIZE) return open;
  }
  return null;
};

export const fetchPrPreviews = async (): Promise<PrPreview[]> => {
  const [previews, openPrs] = await Promise.all([
    fetchPreviewIndex(),
    fetchOpenPrNumbers().catch(() => null),
  ]);
  return keepOpenPreviews(previews, openPrs);
};

export const fetchPreviewIndexEntry = async (pr: number): Promise<PrPreview | undefined> =>
  (await fetchPreviewIndex().catch(() => [])).find((item) => item.pr === pr);
