export type AdminRequest = { action: 'health' } | { action: 'refresh'; location: string };

export const parseAdminRequest = (body: unknown): AdminRequest | null => {
  if (!body || typeof body !== 'object') return null;
  const { action, location } = body as Record<string, unknown>;
  if (action === 'health') return { action };
  if (action === 'refresh' && typeof location === 'string' && location.trim()) {
    return { action, location: location.trim() };
  }
  return null;
};

export interface ScraperRun {
  id: number;
  title: string;
  event: string;
  status: string;
  conclusion: string | null;
  startedAt: string;
  updatedAt: string;
  url: string;
}

const text = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);

export const toScraperRuns = (body: unknown): ScraperRun[] => {
  const runs = (body as { workflow_runs?: unknown })?.workflow_runs;
  if (!Array.isArray(runs)) return [];
  return runs.map((run: Record<string, unknown>) => ({
    id: typeof run.id === 'number' ? run.id : 0,
    title: text(run.display_title, text(run.name)),
    event: text(run.event),
    status: text(run.status),
    conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
    startedAt: text(run.run_started_at, text(run.created_at)),
    updatedAt: text(run.updated_at),
    url: text(run.html_url),
  }));
};

export const isRunActive = (run: ScraperRun) => run.status !== 'completed';

export const lastSuccessfulRun = (runs: ScraperRun[]) =>
  runs.find((run) => run.status === 'completed' && run.conclusion === 'success') ?? null;

export const CRASH_QUERY =
  "select countIf(timestamp > now() - interval 1 day), count() from events where event = '$exception' and timestamp > now() - interval 7 day";

export interface CrashCounts {
  lastDay: number;
  lastWeek: number;
}

export const toCrashCounts = (body: unknown): CrashCounts | null => {
  const row = (body as { results?: unknown[][] })?.results?.[0];
  if (!Array.isArray(row)) return null;
  const [lastDay, lastWeek] = row.map(Number);
  return Number.isFinite(lastDay) && Number.isFinite(lastWeek) ? { lastDay, lastWeek } : null;
};

const SCRAPER_TARGETS: Record<string, { workflow: string; ref: string }> = {
  bdnlfwyfgvaployvrivk: { workflow: 'scraper-dev.yml', ref: 'staging' },
  yrmylgizphirqqkzgbth: { workflow: 'scraper.yml', ref: 'main' },
};

export const scraperTarget = (
  supabaseUrl: string,
  overrides: { workflow?: string; ref?: string },
): { workflow: string; ref: string } | null => {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  const fallback = SCRAPER_TARGETS[ref];
  const workflow = overrides.workflow || fallback?.workflow;
  const branch = overrides.ref || fallback?.ref;
  return workflow && branch ? { workflow, ref: branch } : null;
};
