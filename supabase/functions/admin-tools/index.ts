import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  CRASH_QUERY,
  isRunActive,
  lastSuccessfulRun,
  parseAdminRequest,
  type ScraperRun,
  scraperTarget,
  toCrashCounts,
  toScraperRuns,
} from '../_shared/admin-tools.ts';
import { log } from '../_shared/log.ts';
import { json } from '../_shared/push.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY must be set');
}

const target = scraperTarget(supabaseUrl, {
  workflow: Deno.env.get('ADMIN_SCRAPER_WORKFLOW'),
  ref: Deno.env.get('ADMIN_SCRAPER_REF'),
});

const github = {
  token: Deno.env.get('ADMIN_GITHUB_TOKEN'),
  repo: Deno.env.get('ADMIN_GITHUB_REPO') ?? 'EthanL06/UT-Dining',
  workflow: target?.workflow,
  ref: target?.ref,
};

const posthog = {
  key: Deno.env.get('ADMIN_POSTHOG_API_KEY'),
  project: Deno.env.get('ADMIN_POSTHOG_PROJECT_ID'),
  host: Deno.env.get('ADMIN_POSTHOG_HOST') ?? 'https://us.posthog.com',
};

const service = createClient(supabaseUrl, serviceRoleKey);

const isAdmin = async (req: Request) => {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return false;
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.rpc('is_dashboard_admin');
  return !error && data === true;
};

const githubFetch = (path: string, init?: RequestInit) =>
  fetch(`https://api.github.com/repos/${github.repo}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${github.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ut-dining-admin-tools',
      ...init?.headers,
    },
  });

type RunsResult = { status: 'ready'; runs: ScraperRun[] } | { status: 'unavailable' };

const fetchRuns = async (): Promise<RunsResult> => {
  if (!github.token || !github.workflow) return { status: 'unavailable' };
  const response = await githubFetch(`/actions/workflows/${github.workflow}/runs?per_page=10`);
  if (!response.ok) {
    log.warn('GitHub runs request failed', response.status);
    return { status: 'unavailable' };
  }
  return { status: 'ready', runs: toScraperRuns(await response.json()) };
};

const fetchCrashes = async () => {
  if (!posthog.key || !posthog.project) return { status: 'unavailable' as const };
  const response = await fetch(`${posthog.host}/api/projects/${posthog.project}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${posthog.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: CRASH_QUERY } }),
  });
  const counts = response.ok ? toCrashCounts(await response.json()) : null;
  if (!counts) {
    log.warn('PostHog crash query failed', response.status);
    return { status: 'unavailable' as const };
  }
  return { status: 'ready' as const, ...counts };
};

const health = async () => {
  const [runs, crashes] = await Promise.all([fetchRuns(), fetchCrashes()]);
  return json({
    scraper:
      runs.status === 'ready'
        ? {
            status: 'ready',
            runs: runs.runs.slice(0, 5),
            lastSuccess: lastSuccessfulRun(runs.runs),
            active: runs.runs.some(isRunActive),
          }
        : runs,
    crashes,
  });
};

const refresh = async (location: string) => {
  if (!github.token || !github.workflow || !github.ref) {
    return json({ status: 'unavailable' }, 503);
  }
  const { data: hall, error } = await service
    .from('location')
    .select('name')
    .eq('name', location)
    .eq('has_menus', true)
    .maybeSingle();
  if (error || !hall?.name) return json({ status: 'unknown_location' }, 400);

  const runs = await fetchRuns();
  if (runs.status === 'ready' && runs.runs.some(isRunActive)) {
    return json({ status: 'busy' }, 409);
  }

  const response = await githubFetch(`/actions/workflows/${github.workflow}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: github.ref, inputs: { location: hall.name } }),
  });
  if (!response.ok) {
    log.error('Scraper dispatch failed', response.status, await response.text());
    return json({ status: 'failed' }, 502);
  }
  log.info('Scraper dispatched for', hall.name);
  return json({ status: 'started', location: hall.name, startedAt: new Date().toISOString() });
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!(await isAdmin(req))) return json({ error: 'Forbidden' }, 403);

  const request = parseAdminRequest(await req.json().catch(() => null));
  if (!request) return json({ error: 'Unknown action' }, 400);

  switch (request.action) {
    case 'health':
      return health();
    case 'refresh':
      return refresh(request.location);
  }
});
