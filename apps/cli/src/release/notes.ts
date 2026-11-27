export interface Commit {
  sha: string;
  subject: string;
}

export interface ParsedCommit {
  sha: string;
  type: string;
  scope: string | null;
  breaking: boolean;
  description: string;
  pr: number | null;
}

export interface ChangelogDraftChange {
  icon: 'sparkles' | 'zap' | 'wrench';
  title: string;
  description?: string;
}

export interface ChangelogDraft {
  summary: null;
  release_date: null;
  is_published: false;
  changes: ChangelogDraftChange[];
}

const SUBJECT =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+?)(?: \(#(?<pr>\d+)\))?$/;

const VERSION = /^\d+\.\d+\.\d+$/;

const APP_SCOPES = new Set(['mobile', 'app', 'ios']);

const SECTIONS = [
  { title: 'Breaking changes', match: (commit: ParsedCommit) => commit.breaking },
  { title: 'Features', match: (commit: ParsedCommit) => commit.type === 'feat' },
  { title: 'Fixes', match: (commit: ParsedCommit) => commit.type === 'fix' },
  { title: 'Performance', match: (commit: ParsedCommit) => commit.type === 'perf' },
  { title: 'Maintenance', match: () => true },
];

export const parseCommit = (commit: Commit): ParsedCommit | null => {
  const groups = commit.subject.trim().match(SUBJECT)?.groups;
  if (!groups) return null;
  return {
    sha: commit.sha,
    type: groups.type,
    scope: groups.scope ?? null,
    breaking: Boolean(groups.breaking),
    description: groups.description.trim(),
    pr: groups.pr ? Number(groups.pr) : null,
  };
};

export const readAppVersion = (source: string): string => {
  const version = source.match(/\bversion:\s*['"](\d+\.\d+\.\d+)['"]/)?.[1];
  if (!version) throw new Error('Could not find the app version in apps/mobile/app.config.js.');
  return version;
};

export const tagFor = (version: string) => `v${version}`;

export const compareVersions = (a: string, b: string) => {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const previousTag = (tags: string[], version: string): string | null => {
  const older = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.startsWith('v') && VERSION.test(tag.slice(1)))
    .filter((tag) => compareVersions(tag.slice(1), version) < 0)
    .sort((a, b) => compareVersions(b.slice(1), a.slice(1)));
  return older[0] ?? null;
};

const sentence = (text: string) => {
  const trimmed = text.trim().replace(/[.\s]+$/, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const noteLine = (commit: ParsedCommit, repo: string) => {
  const scope = commit.scope ? `**${commit.scope}:** ` : '';
  const link = commit.pr
    ? ` ([#${commit.pr}](https://github.com/${repo}/pull/${commit.pr}))`
    : ` (${commit.sha.slice(0, 7)})`;
  return `- ${scope}${commit.description}${link}`;
};

export const releaseNotes = (options: {
  version: string;
  commits: Commit[];
  repo: string;
  previous: string | null;
}): string => {
  const parsed = options.commits.map(parseCommit);
  const conventional = parsed.filter((commit): commit is ParsedCommit => commit !== null);
  const skipped = parsed.length - conventional.length;
  const remaining = new Set(conventional);
  const lines: string[] = [];

  for (const section of SECTIONS) {
    const matches = conventional.filter((commit) => remaining.has(commit) && section.match(commit));
    if (matches.length === 0) continue;
    for (const commit of matches) remaining.delete(commit);
    lines.push(`## ${section.title}`, '', ...matches.map((c) => noteLine(c, options.repo)), '');
  }

  if (lines.length === 0) lines.push('No conventional commits since the last release.', '');
  if (skipped > 0) {
    lines.push(
      `Plus ${skipped} commit${skipped === 1 ? '' : 's'} without a conventional title.`,
      '',
    );
  }
  if (options.previous) {
    lines.push(
      `**Full diff:** https://github.com/${options.repo}/compare/${options.previous}...${tagFor(options.version)}`,
      '',
    );
  }
  return lines.join('\n');
};

export const changelogDraft = (commits: Commit[]): ChangelogDraft => {
  const app = commits
    .map(parseCommit)
    .filter((commit): commit is ParsedCommit => commit !== null)
    .filter((commit) => commit.scope !== null && APP_SCOPES.has(commit.scope));

  const features = app
    .filter((commit) => commit.type === 'feat')
    .map(
      (commit): ChangelogDraftChange => ({ icon: 'sparkles', title: sentence(commit.description) }),
    );
  const speed = app
    .filter((commit) => commit.type === 'perf')
    .map((commit): ChangelogDraftChange => ({ icon: 'zap', title: sentence(commit.description) }));
  const fixes = app.filter((commit) => commit.type === 'fix').map((c) => sentence(c.description));

  const changes = [...features, ...speed];
  if (fixes.length === 1) changes.push({ icon: 'wrench', title: fixes[0] });
  if (fixes.length > 1) {
    changes.push({ icon: 'wrench', title: 'Fixes', description: `${fixes.join('. ')}.` });
  }
  if (changes.length === 0) {
    changes.push({ icon: 'wrench', title: 'Performance improvements and bug fixes' });
  }

  return { summary: null, release_date: null, is_published: false, changes };
};
