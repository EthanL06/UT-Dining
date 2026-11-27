#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  type Commit,
  changelogDraft,
  previousTag,
  readAppVersion,
  releaseNotes,
  tagFor,
} from './notes.ts';

const root = join(import.meta.dirname, '..', '..', '..', '..');

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const refExists = (ref: string) => {
  try {
    git('rev-parse', '--quiet', '--verify', `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};

const parentCount = (ref: string) =>
  git('rev-list', '--parents', '-n', '1', ref).trim().split(' ').length - 1;

const readCommits = (from: string, to: string): Commit[] =>
  git('log', '--no-merges', '--format=%H%x1f%s%x1e', `${from}..${to}`)
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, subject] = record.split('\x1f');
      return { sha, subject };
    });

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    base: { type: 'string' },
    head: { type: 'string', default: 'HEAD' },
    out: { type: 'string', default: 'dist/release' },
  },
});

const head = values.head ?? 'HEAD';
const out = resolve(values.out ?? 'dist/release');
const version = readAppVersion(readFileSync(join(root, 'apps/mobile/app.config.js'), 'utf8'));
const packageVersion = JSON.parse(readFileSync(join(root, 'apps/mobile/package.json'), 'utf8'))
  .version as string;
const tag = tagFor(version);
const tagExists = refExists(`refs/tags/${tag}`);
const previous = previousTag(git('tag', '--list', 'v*', '--merged', head).split('\n'), version);

const from = values.base ?? previous ?? (parentCount(head) > 1 ? `${head}^1` : `${head}~1`);
const commits = readCommits(from, head);
const repo = process.env.GITHUB_REPOSITORY ?? 'EthanL06/UT-Dining';

const plan = {
  version,
  tag,
  tagExists,
  previous,
  from,
  head: git('rev-parse', head).trim(),
  commits: commits.length,
  packageVersion,
  versionsMatch: packageVersion === version,
};

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
writeFileSync(join(out, 'notes.md'), releaseNotes({ version, commits, repo, previous }));
writeFileSync(join(out, 'changelog.json'), `${JSON.stringify(changelogDraft(commits), null, 2)}\n`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `version=${version}`,
      `tag=${tag}`,
      `tag_exists=${tagExists}`,
      `versions_match=${plan.versionsMatch}`,
      `dir=${out}`,
      '',
    ].join('\n'),
  );
}

process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
