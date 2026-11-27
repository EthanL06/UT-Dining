export const PREVIEW_BUCKET_PATH = '/storage/v1/object/public/qa-previews/previews.json';

export interface PrPreview {
  pr: number;
  title: string;
  channel: string;
  sha: string;
  runtime: string;
  buildUrl: string;
  updatedAt: string;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '');

export const previewsUrl = (supabaseUrl: string | undefined) =>
  supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}${PREVIEW_BUCKET_PATH}` : null;

export const parsePreviews = (input: unknown): PrPreview[] => {
  if (typeof input !== 'object' || input === null) return [];
  const list = (input as { previews?: unknown }).previews;
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && Number.isInteger(item.pr),
    )
    .map((item) => ({
      pr: item.pr as number,
      title: asString(item.title) || `PR #${item.pr}`,
      channel: asString(item.channel) || `pr-${item.pr}`,
      sha: asString(item.sha),
      runtime: asString(item.runtime),
      buildUrl: asString(item.buildUrl),
      updatedAt: asString(item.updatedAt),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const parsePrNumber = (value: string | string[] | undefined): number | null => {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim().replace(/^#/, '') ?? '';
  if (!/^\d{1,6}$/.test(raw)) return null;
  const number = Number(raw);
  return number > 0 ? number : null;
};

export const isCompatiblePreview = (preview: PrPreview, runtimeVersion: string | null) =>
  !preview.runtime || !runtimeVersion || preview.runtime === runtimeVersion;

export const formatPreviewAge = (updatedAt: string, now: number): string => {
  const time = Date.parse(updatedAt);
  if (Number.isNaN(time)) return 'unknown';
  const minutes = Math.max(0, Math.round((now - time) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

export const RELOAD_REPLAY_WINDOW_MS = 60_000;

export const isReplayedLaunchLink = (reloadedAt: number | undefined, now: number) =>
  reloadedAt !== undefined && now >= reloadedAt && now - reloadedAt < RELOAD_REPLAY_WINDOW_MS;

export const GITHUB_REPO = 'EthanL06/UT-Dining';

export const PR_PAGE_SIZE = 100;

export const pullRequestUrl = (pr: number) => `https://github.com/${GITHUB_REPO}/pull/${pr}`;

export const openPullRequestsUrl = (page: number) =>
  `https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=${PR_PAGE_SIZE}&page=${page}`;

export const parseOpenPrNumbers = (input: unknown): number[] | null => {
  if (!Array.isArray(input)) return null;
  return input
    .map((item) =>
      typeof item === 'object' && item !== null ? (item as { number?: unknown }).number : null,
    )
    .filter((number): number is number => Number.isInteger(number));
};

export const keepOpenPreviews = (previews: PrPreview[], openPrs: ReadonlySet<number> | null) =>
  openPrs ? previews.filter((preview) => openPrs.has(preview.pr)) : previews;
