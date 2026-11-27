import { parseArgs } from 'node:util';
import {
  ageDays,
  behindBy,
  checksFor,
  ETHAN,
  getPrSettled,
  gh,
  ghAll,
  type PullRequest,
  requiredChecks,
} from './github.ts';

const USAGE = `Usage: make status [ARGS="--json"]

One report from GitHub: every open PR with its CI and merge state, what is waiting on Ethan
(green PRs to approve, review requests, issues assigned to him and their open boxes), what needs an
agent (conflicts, red CI), and the latest run of each workflow on staging.`;

const { values } = parseArgs({
  options: {
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

type PrState = 'conflict' | 'red' | 'running' | 'draft' | 'ready';

interface PrRow {
  number: number;
  title: string;
  url: string;
  state: PrState;
  base: string;
  behind: number;
  failing: string[];
  pending: string[];
  reviewRequested: boolean;
  ageDays: number;
}

interface Issue {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  pull_request?: unknown;
}

interface Run {
  name: string;
  conclusion: string | null;
  status: string;
  html_url: string;
  head_sha: string;
  created_at: string;
}

const prRow = async (listed: PullRequest): Promise<PrRow> => {
  const pr = await getPrSettled(listed.number);
  const required = requiredChecks(pr.base.ref);
  const checks = checksFor(pr.head.sha);
  const failing = checks
    .filter((check) => check.state === 'fail' && !check.vercel)
    .map((check) => check.name);
  const pending = required.filter(
    (name) => checks.find((check) => check.name === name)?.state !== 'pass',
  );
  const requiredFailing = failing.filter((name) => required.includes(name));
  const state: PrState =
    pr.mergeable_state === 'dirty'
      ? 'conflict'
      : requiredFailing.length > 0
        ? 'red'
        : pr.draft
          ? 'draft'
          : pending.length > 0
            ? 'running'
            : 'ready';
  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    state,
    base: pr.base.ref,
    behind: behindBy(pr.head.sha, pr.base.ref).ahead_by,
    failing,
    pending,
    reviewRequested: pr.requested_reviewers.some((user) => user.login === ETHAN),
    ageDays: Math.floor(ageDays(pr.updated_at)),
  };
};

const openBoxes = (body: string | null) => (body?.match(/^\s*- \[ \]/gm) ?? []).length;

const main = async () => {
  const listed = ghAll<PullRequest>('pulls?state=open');
  const rows: PrRow[] = [];
  for (const pr of listed) rows.push(await prRow(pr));
  const issues = ghAll<Issue>(`issues?state=open&assignee=${ETHAN}`).filter(
    (issue) => !issue.pull_request,
  );
  const runs = gh<{ workflow_runs: Run[] }>(
    'actions/runs?branch=staging&event=push&per_page=50',
  ).workflow_runs;
  const latestRuns = runs.filter(
    (run, index) => runs.findIndex((other) => other.name === run.name) === index,
  );
  const cutover = [25, 64].map((n) => {
    const item = gh<Issue>(`issues/${n}`);
    return { number: n, title: item.title, url: item.html_url, open: openBoxes(item.body) };
  });

  if (values.json) {
    console.log(JSON.stringify({ prs: rows, issues, staging: latestRuns, cutover }, null, 2));
    return;
  }

  const pr = (row: PrRow, extra = '') =>
    `- #${row.number} ${row.title}${extra ? ` (${extra})` : ''}`;
  const out: string[] = ['# UT Dining status', ''];

  out.push('## Waiting on Ethan', '');
  const ready = rows.filter((row) => row.state === 'ready' && row.base === 'staging');
  for (const row of ready)
    out.push(
      pr(row, `green, needs your OK to merge${row.behind ? `, ${row.behind} behind staging` : ''}`),
    );
  for (const row of rows.filter((r) => r.reviewRequested && r.state !== 'ready'))
    out.push(pr(row, 'review requested'));
  for (const item of cutover.filter((c) => c.open > 0))
    out.push(`- cutover #${item.number} ${item.title}: ${item.open} unchecked steps`);
  const cutoverNumbers = new Set(cutover.map((item) => item.number));
  const actionable = issues.filter(
    (issue) => !cutoverNumbers.has(issue.number) && openBoxes(issue.body) > 0,
  );
  for (const issue of actionable)
    out.push(`- issue #${issue.number} ${issue.title} (${openBoxes(issue.body)} open boxes)`);
  const ideas =
    issues.length - actionable.length - issues.filter((i) => cutoverNumbers.has(i.number)).length;
  if (ideas > 0)
    out.push(`- ${ideas} more issue(s) assigned to ${ETHAN} with no checklist (feature ideas)`);
  if (out.at(-1) === '') out.push('- nothing');

  out.push('', '## Needs an agent', '');
  const broken = rows.filter((row) => row.state === 'conflict' || row.state === 'red');
  for (const row of broken)
    out.push(
      pr(
        row,
        row.state === 'conflict' ? 'merge conflict, no CI runs' : `red: ${row.failing.join(', ')}`,
      ),
    );
  if (broken.length === 0) out.push('- nothing');

  out.push('', '## In progress', '');
  const moving = rows.filter((row) => row.state === 'running' || row.state === 'draft');
  for (const row of moving)
    out.push(pr(row, row.state === 'draft' ? 'draft' : `waiting for ${row.pending.join(', ')}`));
  if (moving.length === 0) out.push('- nothing');

  out.push('', '## Latest staging runs', '');
  for (const run of latestRuns) {
    const result = run.status === 'completed' ? (run.conclusion ?? 'done') : run.status;
    out.push(
      `- ${result === 'success' ? 'ok' : result}: ${run.name} (${run.head_sha.slice(0, 7)})`,
    );
  }
  const stale = rows.filter((row) => row.ageDays >= 3);
  if (stale.length > 0) {
    out.push('', '## Untouched for 3+ days', '');
    for (const row of stale) out.push(pr(row, `${row.ageDays} days`));
  }
  console.log(out.join('\n'));
};

await main();
