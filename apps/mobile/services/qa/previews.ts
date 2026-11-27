import { type PrPreview, parsePreviews, previewsUrl } from '~/utils/previews';

export const PR_PREVIEWS_QUERY_KEY = ['qaPrPreviews'] as const;

export const fetchPrPreviews = async (): Promise<PrPreview[]> => {
  const url = previewsUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (!url) throw new Error('No Supabase URL in this build.');
  const response = await fetch(`${url}?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (response.status === 400 || response.status === 404) return [];
  if (!response.ok) throw new Error(`Preview list returned ${response.status}`);
  return parsePreviews(await response.json());
};
