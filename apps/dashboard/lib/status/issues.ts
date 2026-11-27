import type { CheckedLocation } from './location-checks';
import type { Health } from './menu-health';
import type { MenuStatus } from './menu-status';
import type { Probe } from './probes';
import { SCRAPER_WORKFLOW, type WorkflowRun } from './workflows';

export interface IssueAction {
  label: string;
  href: string;
}

export interface Issue {
  id: string;
  health: Exclude<Health, 'operational'>;
  title: string;
  detail: string;
  headline: string;
  action: IssueAction | null;
}

export interface Coverage {
  items: number;
  missing_nutrition: number;
  missing_ingredients: number;
  missing_allergens: number;
}

export interface IssueInput {
  supabaseUrl: string;
  backend: Probe;
  pushFunction: Probe;
  workflows: WorkflowRun[];
  menus: MenuStatus;
  hourProblems: { location: CheckedLocation; problems: string[] }[];
  coverage: Coverage | null;
}

const SEVERITY: Record<Issue['health'], number> = { outage: 0, degraded: 1, unknown: 2 };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export const supabaseProjectRef = (url: string): string | null => {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.supabase.co') ? host.split('.')[0] : null;
  } catch {
    return null;
  }
};

export const coverageHealth = (missing: number, total: number): Health => {
  if (total === 0) return 'unknown';
  const share = missing / total;
  if (share > 0.25) return 'outage';
  if (share > 0.05) return 'degraded';
  return 'operational';
};

const probeIssue = (
  id: string,
  probe: Probe,
  name: string,
  headline: string,
  explanation: string,
  action: IssueAction | null,
): Issue | null => {
  if (probe.health === 'operational') return null;
  const latency = probe.latencyMs === null ? '' : `, ${probe.latencyMs} ms`;
  return {
    id,
    health: probe.health,
    title: `${name}: ${probe.detail}${latency}`,
    detail: explanation,
    headline,
    action,
  };
};

export const buildIssues = (input: IssueInput): Issue[] => {
  const issues: Issue[] = [];
  const ref = supabaseProjectRef(input.supabaseUrl);
  const scraperRun = input.workflows.find((run) => run.workflow === SCRAPER_WORKFLOW);
  const scraperAction: IssueAction | null = scraperRun?.url
    ? { label: 'Open scraper runs', href: scraperRun.url }
    : null;

  const backend = probeIssue(
    'supabase',
    input.backend,
    'Supabase',
    'Supabase is down',
    'The app and this dashboard cannot read or write data.',
    ref ? { label: 'Open Supabase', href: `https://supabase.com/dashboard/project/${ref}` } : null,
  );
  if (backend) issues.push(backend);

  const push = probeIssue(
    'push-function',
    input.pushFunction,
    'Push function',
    'Push notifications are down',
    'manual-push-notification is not answering, so pushes from the dashboard will not send.',
    ref
      ? {
          label: 'Open function logs',
          href: `https://supabase.com/dashboard/project/${ref}/functions/manual-push-notification/logs`,
        }
      : null,
  );
  if (push) issues.push(push);

  if (input.menus.ok && input.menus.freshness !== 'operational') {
    issues.push({
      id: 'freshness',
      health: input.menus.freshness,
      title: input.menus.freshnessDetail ?? 'Menus are out of date',
      detail: 'The scraper should refresh menus every day.',
      headline: 'Menus are out of date',
      action: scraperAction,
    });
  }

  for (const run of input.workflows) {
    if (run.health !== 'outage' && run.health !== 'degraded') continue;
    issues.push({
      id: `workflow-${run.workflow}`,
      health: run.health,
      title: `${run.label}: last run ${run.state}`,
      detail: run.branch ? `On ${run.branch}.` : 'Check the run log for the failing step.',
      headline: `${run.label} failed`,
      action: run.url ? { label: 'Open run', href: run.url } : null,
    });
  }

  const unreadable = input.workflows.filter(
    (run) => run.health === 'unknown' && run.state.startsWith('GitHub'),
  );
  if (unreadable.length > 0) {
    const rateLimited = unreadable.some((run) => run.state === 'GitHub API 403');
    issues.push({
      id: 'workflows-unreadable',
      health: 'unknown',
      title: `Can't read ${plural(unreadable.length, 'scheduled job')}`,
      detail: `${rateLimited ? 'GitHub API rate limit (403)' : unreadable[0].state}: ${unreadable
        .map((run) => run.label)
        .join(', ')}.`,
      headline: "Some checks couldn't run",
      action: rateLimited
        ? {
            label: 'Create GITHUB_TOKEN',
            href: 'https://github.com/settings/personal-access-tokens/new',
          }
        : null,
    });
  }

  for (const { location, problems } of input.hourProblems) {
    issues.push({
      id: `hours-${location.id}`,
      health: 'degraded',
      title: `${location.name ?? 'Unnamed location'}: ${problems[0].toLowerCase()}`,
      detail:
        problems.length > 1
          ? problems.slice(1).join('. ')
          : 'Its open and closed status in the app may be wrong.',
      headline: 'Location hours need fixing',
      action: { label: 'Edit hours', href: '/dashboard' },
    });
  }

  if (input.coverage) {
    const { items } = input.coverage;
    const rows = [
      { key: 'nutrition', label: 'nutrition facts', missing: input.coverage.missing_nutrition },
      { key: 'ingredients', label: 'ingredients', missing: input.coverage.missing_ingredients },
      { key: 'allergens', label: 'allergens', missing: input.coverage.missing_allergens },
    ];
    for (const row of rows) {
      const health = coverageHealth(row.missing, items);
      if (health !== 'degraded' && health !== 'outage') continue;
      issues.push({
        id: `coverage-${row.key}`,
        health,
        title: `Missing ${row.label} for ${row.missing.toLocaleString()} of ${plural(items, 'item')}`,
        detail: "Today's food items scraped without this data.",
        headline: 'Nutrition data is incomplete',
        action: scraperAction,
      });
    }
  }

  return issues.sort((a, b) => SEVERITY[a.health] - SEVERITY[b.health]);
};

export const overallHealth = (issues: Issue[]): Health => issues[0]?.health ?? 'operational';
