import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ageDays, env, gh, ghAll, OWNER, PROTECTED_BRANCHES, say, tryGh } from './github.ts';

const USAGE = `Usage: make cleanup [YES=1]

Lists, and with YES=1 deletes:
  - remote branches whose PR merged at the branch's current commit and that no open PR is based on
    (the same rule as the weekly branch-cleanup workflow);
  - local branches whose PR merged at the branch's current commit;
  - worktrees in .worktrees/ and .claude/worktrees/ with no uncommitted or unpushed work
    (scripts/dev/clean.sh worktrees);
  - leftover E2E simulator clones and expired simulator leases (scripts/dev/clean.sh sims, macOS).
Never touches main, staging, gh-pages, assets/* or renovate/*. Remote branches with no PR are
only listed, with their age, because they may be someone's work in progress.`;

const { values } = parseArgs({
  options: {
    yes: { type: 'boolean', default: env('YES') === '1' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const apply = values.yes;
const root = join(import.meta.dirname, '..', '..', '..');
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

interface BranchPr {
  state: string;
  merged_at: string | null;
  number: number;
  head: { sha: string };
}

const prsFor = (branch: string) =>
  gh<BranchPr[]>(`pulls?state=all&head=${OWNER}:${encodeURIComponent(branch)}&per_page=100`);

const mergedAt = (prs: BranchPr[], sha: string) =>
  prs.some((pr) => pr.merged_at !== null && pr.head.sha === sha) &&
  !prs.some((pr) => pr.state === 'open');

const remoteBranches = () => {
  say.step('Remote branches');
  const branches = ghAll<{ name: string; commit: { sha: string } }>('branches');
  let deleted = 0;
  const orphans: string[] = [];
  for (const branch of branches) {
    if (PROTECTED_BRANCHES.test(branch.name)) continue;
    const prs = prsFor(branch.name);
    if (prs.length === 0) {
      const date = gh<{ commit: { committer: { date: string } } }>(`commits/${branch.commit.sha}`)
        .commit.committer.date;
      orphans.push(`${branch.name} (no PR, last commit ${Math.floor(ageDays(date))} days ago)`);
      continue;
    }
    if (!mergedAt(prs, branch.commit.sha)) continue;
    const stacked = gh<unknown[]>(`pulls?state=open&base=${encodeURIComponent(branch.name)}`);
    if (stacked.length > 0) {
      say.note(`kept ${branch.name}: open PRs are based on it`);
      continue;
    }
    if (apply) {
      const result = tryGh(`git/refs/heads/${branch.name}`, 'DELETE');
      if (!result.ok) {
        say.warn(`could not delete ${branch.name}: ${result.error.message}`);
        continue;
      }
    }
    deleted++;
    say.ok(`${apply ? 'deleted' : 'would delete'} ${branch.name}`);
  }
  for (const orphan of orphans) say.note(orphan);
  say.ok(`${deleted} merged branch(es) ${apply ? 'deleted' : 'to delete'}`);
};

const localBranches = () => {
  say.step('Local branches');
  if (apply) spawnSync('git', ['remote', 'prune', 'origin'], { cwd: root, stdio: 'ignore' });
  const current = git('branch', '--show-current').trim();
  const checkedOut = new Set(
    git('worktree', 'list', '--porcelain')
      .split('\n')
      .filter((line) => line.startsWith('branch refs/heads/'))
      .map((line) => line.slice('branch refs/heads/'.length)),
  );
  let deleted = 0;
  for (const line of git('for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads')
    .trim()
    .split('\n')) {
    const [name, sha] = line.split(' ');
    if (!name || !sha || PROTECTED_BRANCHES.test(name) || name === current || checkedOut.has(name))
      continue;
    if (!mergedAt(prsFor(name), sha)) continue;
    if (apply) git('branch', '-D', name);
    deleted++;
    say.ok(`${apply ? 'deleted' : 'would delete'} ${name}`);
  }
  say.ok(`${deleted} merged local branch(es) ${apply ? 'deleted' : 'to delete'}`);
};

const local = (command: 'worktrees' | 'sims') => {
  if (!apply) {
    say.step(command === 'worktrees' ? 'Worktrees' : 'Simulators');
    say.note(
      command === 'worktrees'
        ? git('worktree', 'list').trim()
        : 'E2E clones and expired leases are deleted with YES=1 (macOS only)',
    );
    return;
  }
  spawnSync(join(root, 'scripts/dev/clean.sh'), [command], { cwd: root, stdio: 'inherit' });
};

remoteBranches();
localBranches();
local('worktrees');
local('sims');
if (!apply) say.note('Dry run. Run make cleanup YES=1 to delete.');
