import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const BUILD = 1;
const SKIP = 0;

const ROOT_FILES = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.node-version',
  '.npmrc',
  'scripts/vercel-ignore.mjs',
];
const ROOT_DIRS = ['patches/'];
const ALWAYS_PREVIEW_BRANCHES = ['staging'];
const FALLBACK_BASE_BRANCH = 'staging';
const FORK_SEARCH_DEPTH = 200;

const git = (root, args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();

const hasCommit = (root, sha) => {
  try {
    git(root, ['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
};

const remoteFor = (env) =>
  env.VERCEL_GIT_PROVIDER === 'github' && env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG
    ? `https://github.com/${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}.git`
    : 'origin';

const fetchRef = (root, remote, ref, depth = 1) => {
  try {
    git(root, ['fetch', '--quiet', '--no-tags', `--depth=${depth}`, remote, ref]);
    return git(root, ['rev-parse', 'FETCH_HEAD']);
  } catch {
    return null;
  }
};

const mergeBase = (root, sha) => {
  try {
    return git(root, ['merge-base', 'HEAD', sha]);
  } catch {
    return null;
  }
};

const forkPoint = (root, remote, branch) => {
  const tip = fetchRef(root, remote, FALLBACK_BASE_BRANCH, FORK_SEARCH_DEPTH);
  if (!tip) return null;
  const found = mergeBase(root, tip);
  if (found || !branch) return found;
  try {
    git(root, ['fetch', '--quiet', '--no-tags', `--deepen=${FORK_SEARCH_DEPTH}`, remote, branch]);
  } catch {
    return null;
  }
  return mergeBase(root, tip);
};

const resolveBase = (root, env, log) => {
  const remote = remoteFor(env);
  const previous = env.VERCEL_GIT_PREVIOUS_SHA;
  if (previous) {
    if (hasCommit(root, previous) || fetchRef(root, remote, previous)) {
      log(`Comparing against the last deployed commit ${previous.slice(0, 7)}`);
      return previous;
    }
    log(`Last deployed commit ${previous.slice(0, 7)} is no longer reachable`);
  }
  if (env.VERCEL_ENV === 'production') return null;
  const branch = env.VERCEL_GIT_COMMIT_REF;
  if (branch === FALLBACK_BASE_BRANCH) return null;
  const fork = forkPoint(root, remote, branch);
  if (fork) {
    log(`Comparing against where this branch left ${FALLBACK_BASE_BRANCH}, ${fork.slice(0, 7)}`);
    return fork;
  }
  return null;
};

const workspaceDirs = (root) => {
  const dirs = new Map();
  for (const group of ['apps', 'packages']) {
    const groupDir = join(root, group);
    if (!existsSync(groupDir)) continue;
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(groupDir, entry.name, 'package.json');
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      dirs.set(pkg.name, { dir: `${group}/${entry.name}/`, pkg });
    }
  }
  return dirs;
};

export const relevantDirs = (root, appDir) => {
  const workspaces = workspaceDirs(root);
  const appPkg = JSON.parse(readFileSync(join(root, appDir, 'package.json'), 'utf8'));
  const seen = new Set([`${appDir.replace(/\/?$/, '/')}`]);
  const queue = [appPkg];
  while (queue.length > 0) {
    const pkg = queue.shift();
    const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    for (const [name, version] of Object.entries(deps)) {
      if (!String(version).startsWith('workspace:')) continue;
      const workspace = workspaces.get(name);
      if (!workspace || seen.has(workspace.dir)) continue;
      seen.add(workspace.dir);
      queue.push(workspace.pkg);
    }
  }
  return [...seen].sort();
};

export const isRelevant = (file, dirs) =>
  ROOT_FILES.includes(file) ||
  ROOT_DIRS.some((dir) => file.startsWith(dir)) ||
  dirs.some((dir) => file.startsWith(dir));

export const decide = ({ root, appDir, env, log = console.log }) => {
  if (!env.VERCEL) {
    log('Not running on Vercel, building');
    return BUILD;
  }

  const branch = env.VERCEL_GIT_COMMIT_REF ?? '';
  const isProduction = env.VERCEL_ENV === 'production';
  const hasPullRequest = Boolean(env.VERCEL_GIT_PULL_REQUEST_ID);

  if (!isProduction && !hasPullRequest && !ALWAYS_PREVIEW_BRANCHES.includes(branch)) {
    log(`Skipping: ${branch} has no open pull request`);
    return SKIP;
  }

  const base = resolveBase(root, env, log);
  if (!base) {
    log('No commit to compare against, building');
    return BUILD;
  }

  let changed;
  try {
    changed = git(root, ['diff', '--name-only', base, 'HEAD']).split('\n').filter(Boolean);
  } catch {
    log('Could not diff against the base commit, building');
    return BUILD;
  }

  const dirs = relevantDirs(root, appDir);
  const hits = changed.filter((file) => isRelevant(file, dirs));
  if (hits.length === 0) {
    log(`Skipping: none of ${changed.length} changed files affect ${dirs.join(', ')}`);
    return SKIP;
  }
  log(`Building: ${hits.length} changed files affect this app, for example ${hits[0]}`);
  return BUILD;
};

const isMain = process.argv[1] && import.meta.filename === process.argv[1];
if (isMain) {
  const root = git(process.cwd(), ['rev-parse', '--show-toplevel']);
  const appDir = relative(root, process.cwd());
  process.exit(decide({ root, appDir, env: process.env }));
}
