import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { ETHAN, env, getPr, gh, prFiles, prNumber, REPO, say, tryGh } from './github.ts';

const USAGE = `Usage: make pr-setup PR=<n> [THREAD=<project thread URL>] [LABELS="mobile tooling"] [IMAGES=<dir>]
       node scripts/dev/ops/pr-setup.ts <n> [--thread <url>] [--requested-by <name>] [--login <github login>]
                                        [--label <name> ...] [--images <dir>] [--images-title <heading>]
                                        [--width <px>]

Finishes a PR the way the project expects, idempotently:
  - Puts the two attribution lines at the top of the body when --thread (or CLAUDE_PROJECT_THREAD_URL)
    is given and the body does not start with them yet.
  - Assigns ${ETHAN} and requests his review (skipped when he opened the PR).
  - Adds the given labels (they must already exist in the repo), plus "migration" when the PR
    changes supabase/migrations/.
  - Uploads every PNG, JPG or GIF in --images to the orphan branch assets/pr-<n> (with the two
    vercel.json files) and embeds each one inline in a "screenshots" section of the body, replacing
    the previous set. Files named <screen>-light.png and <screen>-dark.png are shown side by side.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    thread: { type: 'string', default: env('CLAUDE_PROJECT_THREAD_URL') },
    'requested-by': { type: 'string', default: 'Ethan' },
    login: { type: 'string', default: ETHAN },
    label: { type: 'string', multiple: true, default: [] },
    images: { type: 'string' },
    'images-title': { type: 'string', default: 'Screenshots' },
    width: { type: 'string', default: '300' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const number = prNumber(positionals[0], USAGE);
const login = values.login;
const START = '<!-- pr-images:start -->';
const MIGRATIONS = /^supabase\/migrations\//;
const MIGRATION_LABEL = 'migration';
const END = '<!-- pr-images:end -->';
const ATTRIBUTION = '<!-- claude-projects-attribution:';

const withAttribution = (body: string): string => {
  if (body.trimStart().startsWith(ATTRIBUTION)) {
    say.ok('attribution lines already there');
    return body;
  }
  if (!values.thread) {
    say.warn('no attribution lines and no --thread URL, so none were added');
    return body;
  }
  say.ok('attribution lines added');
  return `${ATTRIBUTION} ${JSON.stringify({ github_login: login })} -->\n_Requested by **${values['requested-by']}** · [project thread](${values.thread})_\n\n${body}`;
};

const IMAGE = /\.(png|jpe?g|gif)$/i;
const VERCEL_JSON = '{ "git": { "deploymentEnabled": false } }\n';

const uploadImages = (dir: string): { name: string; url: string }[] => {
  const files = readdirSync(dir)
    .filter((file) => IMAGE.test(file))
    .sort();
  if (files.length === 0) say.die(`no PNG, JPG or GIF files in ${dir}`);
  const branch = `assets/pr-${number}`;
  const remote = `https://github.com/${REPO}.git`;
  const work = mkdtempSync(join(tmpdir(), 'pr-setup-'));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], {
      cwd: work,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  try {
    git('init', '-q');
    const exists = spawnSync('git', ['fetch', '-q', '--depth', '1', remote, branch], { cwd: work });
    if (exists.status === 0) git('checkout', '-q', 'FETCH_HEAD');
    else git('checkout', '-q', '--orphan', 'assets');
    const folder = `pr-setup/${new Date().toISOString().replace(/[:.]/g, '-')}`;
    mkdirSync(join(work, folder), { recursive: true });
    for (const file of files) copyFileSync(join(dir, file), join(work, folder, file));
    for (const app of ['dashboard', 'website']) {
      mkdirSync(join(work, 'apps', app), { recursive: true });
      writeFileSync(join(work, 'apps', app, 'vercel.json'), VERCEL_JSON);
    }
    git('add', '-A');
    git(
      '-c',
      'user.name=UT Dining agent',
      '-c',
      'user.email=agent@users.noreply.github.com',
      'commit',
      '-q',
      '-m',
      `chore: images for #${number}`,
    );
    const commit = git('rev-parse', 'HEAD');
    git('push', '-q', '--no-verify', remote, `HEAD:refs/heads/${branch}`);
    say.ok(`uploaded ${files.length} image(s) to ${branch}`);
    return files.map((file) => ({
      name: basename(file, extname(file)),
      url: `https://raw.githubusercontent.com/${REPO}/${commit}/${folder}/${encodeURIComponent(file)}`,
    }));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

const imageSection = (images: { name: string; url: string }[]): string => {
  const width = values.width;
  const img = (image: { name: string; url: string }) =>
    `<img src="${image.url}" width="${width}" alt="${image.name}">`;
  const byName = new Map(images.map((image) => [image.name, image]));
  const used = new Set<string>();
  const rows: string[] = [];
  for (const image of images) {
    if (used.has(image.name)) continue;
    const darkOf = /^(.*)([-_])dark$/.exec(image.name);
    if (darkOf && byName.has(`${darkOf[1]}${darkOf[2]}light`)) continue;
    const pair = /^(.*)[-_]light$/.exec(image.name);
    const dark = pair
      ? (byName.get(`${pair[1]}-dark`) ?? byName.get(`${pair[1]}_dark`))
      : undefined;
    if (pair && dark) {
      used.add(image.name);
      used.add(dark.name);
      rows.push(
        `**${pair[1]}**\n\n| Light | Dark |\n| --- | --- |\n| ${img(image)} | ${img(dark)} |`,
      );
    } else {
      used.add(image.name);
      rows.push(`**${image.name}**\n\n${img(image)}`);
    }
  }
  return `${START}\n## ${values['images-title']}\n\n${rows.join('\n\n')}\n${END}`;
};

const withImages = (body: string): string => {
  if (!values.images) return body;
  const section = imageSection(uploadImages(values.images));
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start >= 0 && end > start)
    return `${body.slice(0, start)}${section}${body.slice(end + END.length)}`;
  return `${body.trimEnd()}\n\n${section}\n`;
};

const main = () => {
  const pr = getPr(number);
  say.step(`#${number} ${pr.title}`);
  const before = pr.body ?? '';
  const body = withImages(withAttribution(before));
  if (body !== before) {
    gh(`pulls/${number}`, 'PATCH', { body });
    say.ok('body updated');
  }

  if (pr.assignees.some((user) => user.login === login)) say.ok(`${login} already assigned`);
  else {
    const assigned = tryGh(`issues/${number}/assignees`, 'POST', { assignees: [login] });
    if (assigned.ok) say.ok(`assigned ${login}`);
    else say.warn(`could not assign ${login}: ${assigned.error.message}`);
  }

  if (pr.user.login === login) say.note(`${login} opened the PR, so no review request`);
  else if (pr.requested_reviewers.some((user) => user.login === login))
    say.ok(`review already requested from ${login}`);
  else {
    const review = tryGh(`pulls/${number}/requested_reviewers`, 'POST', { reviewers: [login] });
    if (review.ok) say.ok(`requested a review from ${login}`);
    else say.warn(`could not request a review: ${review.error.message}`);
  }

  const labels = values.label.flatMap((label) => label.split(/[\s,]+/)).filter(Boolean);
  if (prFiles(number).some((file) => MIGRATIONS.test(file))) labels.push(MIGRATION_LABEL);
  if (labels.length > 0) {
    const known = new Set(
      gh<{ name: string }[]>('labels?per_page=100').map((label) => label.name.toLowerCase()),
    );
    const unknown = labels.filter((label) => !known.has(label.toLowerCase()));
    if (unknown.length > 0) say.warn(`not a label in this repo, skipped: ${unknown.join(', ')}`);
    const valid = labels.filter((label) => known.has(label.toLowerCase()));
    if (valid.length > 0) {
      gh(`issues/${number}/labels`, 'POST', { labels: valid });
      say.ok(`labels: ${valid.join(', ')}`);
    }
  }
  say.ok(pr.html_url);
};

main();
