import { appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { behindBy, env, gh, ghAll, type PullRequest, prFiles, REPO, say, tryGh } from './github.ts';

const USAGE = `Usage: make update-prs [ARGS="--range <before>..<after> --all --dry-run"]

Merges staging into every open PR on staging that is behind it and touches a file the latest
change on staging touched, so those PRs stay mergeable and CI keeps running. Uses the
update-branch API (a merge commit, never a force push).

  --range a..b   The staging change to compare against (what a push event gives). Default: the
                 newest commit on staging.
  --all          Update every PR that is behind, overlapping or not.
  --dry-run      Only report.
A PR with a real conflict is reported, not touched; fix it with make pr-ready PR=<n>.`;

const { values } = parseArgs({
  options: {
    range: { type: 'string' },
    all: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    base: { type: 'string', default: 'staging' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const base = values.base;
const dryRun = values['dry-run'];
const summary: string[] = [];
const record = (text: string) => summary.push(`- ${text}`);

const changedOnBase = (): string[] => {
  if (values.range) {
    const [from, to] = values.range.split('..');
    if (!from || !to || /^0+$/.test(from)) return changedOnBaseHead();
    return (
      gh<{ files?: { filename: string }[] }>(`compare/${from}...${to}`).files?.map(
        (file) => file.filename,
      ) ?? []
    );
  }
  return changedOnBaseHead();
};

const changedOnBaseHead = () =>
  gh<{ files?: { filename: string }[] }>(`commits/${encodeURIComponent(base)}`).files?.map(
    (file) => file.filename,
  ) ?? [];

const changed = new Set(values.all ? [] : changedOnBase());
say.step(
  values.all
    ? `Open PRs on ${base} that are behind it`
    : `Open PRs on ${base} that touch the ${changed.size} file(s) the latest change touched`,
);

const prs = ghAll<PullRequest>(`pulls?state=open&base=${encodeURIComponent(base)}`);
let updated = 0;
for (const pr of prs) {
  const label = `#${pr.number} ${pr.title}`;
  if (pr.head.repo?.full_name !== REPO) {
    say.note(`${label}: from a fork, skipped`);
    continue;
  }
  const overlap = values.all ? [] : prFiles(pr.number).filter((file) => changed.has(file));
  if (!values.all && overlap.length === 0) continue;
  const behind = behindBy(pr.head.sha, base).ahead_by;
  if (behind === 0) {
    say.ok(`${label}: up to date`);
    continue;
  }
  const why = values.all
    ? ''
    : ` (shares ${overlap.slice(0, 3).join(', ')}${overlap.length > 3 ? ', ...' : ''})`;
  if (dryRun) {
    say.note(`${label}: ${behind} behind${why}, would merge ${base} in`);
    record(`#${pr.number}: would merge \`${base}\` in${why}`);
    continue;
  }
  const result = tryGh(`pulls/${pr.number}/update-branch`, 'PUT', {
    expected_head_sha: pr.head.sha,
  });
  if (result.ok) {
    updated++;
    say.ok(`${label}: merged ${base} in${why}`);
    record(`#${pr.number}: merged \`${base}\` in${why}`);
  } else if (/conflict/i.test(result.error.message)) {
    say.warn(
      `${label}: conflicts with ${base}, needs a manual merge (make pr-ready PR=${pr.number})`,
    );
    record(`#${pr.number}: **conflicts** with \`${base}\`, needs a manual merge`);
  } else {
    say.bad(`${label}: ${result.error.message}`);
    record(`#${pr.number}: update failed: ${result.error.message}`);
  }
}
say.ok(`${updated} PR(s) updated${dryRun ? ' (dry run)' : ''}`);

const stepSummary = env('GITHUB_STEP_SUMMARY');
if (stepSummary) {
  appendFileSync(
    stepSummary,
    `## Open PRs updated with ${base}\n\n${summary.length > 0 ? summary.join('\n') : 'Nothing to update.'}\n`,
  );
}
