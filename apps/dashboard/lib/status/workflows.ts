import type { Health } from './menu-health';

const REPO = 'EthanL06/UT-Dining';

export interface WorkflowRun {
  workflow: string;
  label: string;
  health: Health;
  state: string;
  branch: string | null;
  event: string | null;
  startedAt: string | null;
  durationSeconds: number | null;
  url: string | null;
  note: string | null;
}

interface GitHubRun {
  status: string;
  conclusion: string | null;
  head_branch: string | null;
  event: string | null;
  run_started_at: string | null;
  updated_at: string | null;
  html_url: string;
}

const runHealth = (run: GitHubRun): Health => {
  if (run.status !== 'completed') return 'unknown';
  if (run.conclusion === 'success') return 'operational';
  if (run.conclusion === 'skipped' || run.conclusion === 'cancelled') return 'degraded';
  return 'outage';
};

export const getLatestWorkflowRun = async (
  workflow: string,
  label: string,
): Promise<WorkflowRun> => {
  const empty = {
    workflow,
    label,
    branch: null,
    event: null,
    startedAt: null,
    durationSeconds: null,
    url: `https://github.com/${REPO}/actions/workflows/${workflow}`,
  };
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ut-dining-dashboard',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/runs?per_page=1&exclude_pull_requests=true`,
      { headers, next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) },
    );
    if (response.status === 404) {
      return {
        ...empty,
        health: 'unknown',
        state: 'Not on main',
        note: 'GitHub lists this workflow once it runs from the default branch.',
      };
    }
    if (!response.ok) {
      return {
        ...empty,
        health: 'unknown',
        state: `GitHub API ${response.status}`,
        note: response.status === 403 ? 'Rate limited. Set GITHUB_TOKEN to raise the limit.' : null,
      };
    }
    const body = (await response.json()) as { workflow_runs: GitHubRun[] };
    const run = body.workflow_runs[0];
    if (!run) return { ...empty, health: 'unknown', state: 'No runs yet', note: null };

    const started = run.run_started_at ? Date.parse(run.run_started_at) : null;
    const finished = run.updated_at ? Date.parse(run.updated_at) : null;
    return {
      workflow,
      label,
      health: runHealth(run),
      state: run.status === 'completed' ? (run.conclusion ?? 'completed') : run.status,
      branch: run.head_branch,
      event: run.event,
      startedAt: run.run_started_at,
      durationSeconds:
        started && finished && run.status === 'completed'
          ? Math.round((finished - started) / 1000)
          : null,
      url: run.html_url,
      note: null,
    };
  } catch {
    return { ...empty, health: 'unknown', state: 'GitHub unreachable', note: null };
  }
};
