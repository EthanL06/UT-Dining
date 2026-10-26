import pLimit from 'p-limit';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface HttpStats {
  requests: number;
  retries: number;
  bytes: number;
}

export const createClient = ({
  concurrency,
  retries = 4,
  timeoutMs = 20_000,
}: {
  concurrency: number;
  retries?: number;
  timeoutMs?: number;
}) => {
  const limit = pLimit(concurrency);
  const stats: HttpStats = { requests: 0, retries: 0, bytes: 0 };

  const attempt = async (url: string) => {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.text();
  };

  const get = (url: string) =>
    limit(async () => {
      for (let i = 0; ; i++) {
        stats.requests++;
        try {
          const html = await attempt(url);
          stats.bytes += html.length;
          return html;
        } catch (error) {
          if (i >= retries) throw error;
          stats.retries++;
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** i));
        }
      }
    });

  return { get, stats };
};

export type HttpClient = ReturnType<typeof createClient>;
