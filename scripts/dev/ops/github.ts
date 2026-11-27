import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export const env = (name: string): string | undefined => process.env[name] || undefined;

export const REPO = env('REPO') ?? 'EthanL06/UT-Dining';
export const OWNER = REPO.split('/')[0] ?? 'EthanL06';
export const ETHAN = 'EthanL06';
export const PROD_REF = 'yrmylgizphirqqkzgbth';
export const DEV_REF = 'bdnlfwyfgvaployvrivk';
export const REQUIRED_CHECKS = ['Lint, typecheck, test', 'Conventional PR title'];
export const PROTECTED_BRANCHES = /^(main|staging|gh-pages|assets\/.*|renovate\/.*)$/;

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const fullPath = (path: string) =>
  path.startsWith('repos/') || path.startsWith('search/') || path.startsWith('users/')
    ? path
    : `repos/${REPO}/${path}`;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const errorMessage = (stdout: string, stderr: string, status: number) => {
  const parsed = parseJson(stdout) as { message?: string; errors?: unknown } | undefined;
  if (parsed?.message) {
    const errors = parsed.errors ? ` ${JSON.stringify(parsed.errors)}` : '';
    return `${parsed.message}${errors} (HTTP ${status})`;
  }
  return stderr.trim() || `gh api failed (HTTP ${status})`;
};

export const ghText = (path: string, method: Method = 'GET', body?: unknown): string => {
  const args = ['api', '-X', method, fullPath(path)];
  if (body !== undefined) args.push('--input', '-');
  const run = spawnSync('gh', args, {
    input: body === undefined ? '' : JSON.stringify(body),
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (run.error) throw new Error(`Could not run gh: ${run.error.message}`);
  if (run.status !== 0) {
    const status = Number(/HTTP (\d{3})/.exec(run.stderr)?.[1] ?? 0);
    throw new ApiError(errorMessage(run.stdout, run.stderr, status), status);
  }
  return run.stdout;
};

export const gh = <T>(path: string, method: Method = 'GET', body?: unknown): T => {
  const text = ghText(path, method, body);
  return (text.trim() ? JSON.parse(text) : null) as T;
};

export const ghAll = <T>(path: string, limit = 2000): T[] => {
  const items: T[] = [];
  const separator = path.includes('?') ? '&' : '?';
  for (let page = 1; items.length < limit; page++) {
    const batch = gh<T[]>(`${path}${separator}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
};

export const tryGh = <T>(
  path: string,
  method: Method = 'GET',
  body?: unknown,
): { ok: true; data: T } | { ok: false; error: ApiError } => {
  try {
    return { ok: true, data: gh<T>(path, method, body) };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error };
    throw error;
  }
};

export const sleep = (ms: number) => delay(ms);

export interface PullRequest {
  number: number;
  title: string;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  merged_at: string | null;
  merge_commit_sha: string | null;
  mergeable: boolean | null;
  mergeable_state: string;
  body: string | null;
  html_url: string;
  updated_at: string;
  user: { login: string };
  assignees: { login: string }[];
  requested_reviewers: { login: string }[];
  labels: { name: string }[];
  head: { ref: string; sha: string; repo: { full_name: string } | null };
  base: { ref: string; sha: string };
}

export interface CheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending';
  conclusion: string | null;
  html_url: string;
  details_url: string | null;
  started_at: string | null;
  app: { slug: string } | null;
}

export interface CommitStatus {
  context: string;
  state: 'success' | 'failure' | 'error' | 'pending';
  description: string | null;
  target_url: string | null;
}

export const getPr = (number: number) => gh<PullRequest>(`pulls/${number}`);

export const getPrSettled = async (number: number): Promise<PullRequest> => {
  let pr = getPr(number);
  for (let i = 0; i < 15 && pr.state === 'open' && pr.mergeable === null; i++) {
    await sleep(2000);
    pr = getPr(number);
  }
  return pr;
};

export const prFiles = (number: number) =>
  ghAll<{ filename: string; previous_filename?: string }>(`pulls/${number}/files`).flatMap(
    (file) => (file.previous_filename ? [file.filename, file.previous_filename] : [file.filename]),
  );

export const behindBy = (headSha: string, base = 'staging') =>
  gh<{ ahead_by: number; merge_base_commit: { sha: string } }>(
    `compare/${headSha}...${encodeURIComponent(base)}`,
  );

const requiredCache = new Map<string, string[]>();

export const requiredChecks = (base: string): string[] => {
  const cached = requiredCache.get(base);
  if (cached) return cached;
  const found = lookupRequiredChecks(base);
  requiredCache.set(base, found);
  return found;
};

const lookupRequiredChecks = (base: string): string[] => {
  const rules = tryGh<
    { type: string; parameters?: { required_status_checks?: { context: string }[] } }[]
  >(`rules/branches/${encodeURIComponent(base)}`);
  const fromRules = rules.ok
    ? rules.data.flatMap((rule) =>
        rule.type === 'required_status_checks'
          ? (rule.parameters?.required_status_checks ?? []).map((check) => check.context)
          : [],
      )
    : [];
  return [...new Set([...REQUIRED_CHECKS, ...fromRules])];
};

export type CheckState = 'pass' | 'fail' | 'pending' | 'missing';

export interface CheckSummary {
  name: string;
  state: CheckState;
  detail: string;
  url: string | null;
  jobId: number | null;
  vercel: boolean;
}

const PASSING = new Set(['success', 'neutral', 'skipped']);

const latestByName = (runs: CheckRun[]) => {
  const latest = new Map<string, CheckRun>();
  for (const run of runs) {
    const current = latest.get(run.name);
    if (!current || run.id > current.id) latest.set(run.name, run);
  }
  return [...latest.values()];
};

export const checksFor = (sha: string): CheckSummary[] => {
  const runs = gh<{ check_runs: CheckRun[] }>(`commits/${sha}/check-runs?per_page=100`).check_runs;
  const statuses = gh<{ statuses: CommitStatus[] }>(`commits/${sha}/status`).statuses;
  const fromRuns = latestByName(runs).map((run): CheckSummary => {
    const state: CheckState =
      run.status !== 'completed' ? 'pending' : PASSING.has(run.conclusion ?? '') ? 'pass' : 'fail';
    return {
      name: run.name,
      state,
      detail: run.status === 'completed' ? (run.conclusion ?? 'done') : run.status,
      url: run.html_url,
      jobId: run.app?.slug === 'github-actions' ? run.id : null,
      vercel: run.app?.slug === 'vercel' || /vercel/i.test(run.name),
    };
  });
  const seen = new Set<string>();
  const fromStatuses = statuses
    .filter((status) => {
      if (seen.has(status.context)) return false;
      seen.add(status.context);
      return true;
    })
    .map(
      (status): CheckSummary => ({
        name: status.context,
        state:
          status.state === 'success' ? 'pass' : status.state === 'pending' ? 'pending' : 'fail',
        detail: status.description ?? status.state,
        url: status.target_url,
        jobId: null,
        vercel: /vercel/i.test(status.context),
      }),
    );
  return [...fromRuns, ...fromStatuses];
};

export const jobLogTail = (jobId: number, lines = 40): string => {
  const text = (() => {
    try {
      return ghText(`actions/jobs/${jobId}/logs`);
    } catch (error) {
      return `(could not read the job log: ${error instanceof Error ? error.message : String(error)})`;
    }
  })();
  const clean = text
    .split('\n')
    .map((line) => line.replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z ?/, '').trimEnd())
    .filter((line) => line && !line.startsWith('##[group]') && !line.startsWith('##[endgroup]'));
  const errorAt = clean.findIndex((line) => line.startsWith('##[error]'));
  const end = errorAt >= 0 ? Math.min(clean.length, errorAt + 5) : clean.length;
  return clean.slice(Math.max(0, end - lines), end).join('\n');
};

const color = (code: string) => (text: string) =>
  process.stdout.isTTY && !env('NO_COLOR') ? `\u001b[${code}m${text}\u001b[0m` : text;
const bold = color('1');
const green = color('32');
const yellow = color('33');
const red = color('31');
const dim = color('2');

export const say = {
  step: (text: string) => console.log(bold(`==> ${text}`)),
  ok: (text: string) => console.log(`  ${green('ok')}    ${text}`),
  note: (text: string) => console.log(`  ${dim(text)}`),
  warn: (text: string) => console.log(`  ${yellow('warn')}  ${text}`),
  bad: (text: string) => console.log(`  ${red('fail')}  ${text}`),
  die: (text: string, code = 1): never => {
    console.error(`${red('error:')} ${text}`);
    process.exit(code);
  },
};

export const prNumber = (value: string | undefined, usage: string): number => {
  const number = Number(value);
  if (!value || !Number.isInteger(number) || number <= 0) say.die(usage, 2);
  return number;
};

export const ageDays = (iso: string) => (Date.now() - Date.parse(iso)) / 86_400_000;
