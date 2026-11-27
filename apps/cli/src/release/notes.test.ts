import { describe, expect, it } from 'vitest';
import {
  changelogDraft,
  parseCommit,
  previousTag,
  readAppVersion,
  releaseNotes,
  tagFor,
} from './notes.ts';

const commit = (subject: string, sha = 'abcdef1234567890') => ({ sha, subject });

describe('parseCommit', () => {
  it('reads type, scope, description and PR number', () => {
    expect(parseCommit(commit('feat(mobile): add a QA menu (#70)'))).toEqual({
      sha: 'abcdef1234567890',
      type: 'feat',
      scope: 'mobile',
      breaking: false,
      description: 'add a QA menu',
      pr: 70,
    });
  });

  it('handles a missing scope, a breaking marker and no PR number', () => {
    expect(parseCommit(commit('feat!: drop the old API'))).toMatchObject({
      scope: null,
      breaking: true,
      description: 'drop the old API',
      pr: null,
    });
  });

  it('returns null for a title that is not conventional', () => {
    expect(parseCommit(commit('Merge pull request #12 from EthanL06/staging'))).toBeNull();
    expect(parseCommit(commit('Update README.md'))).toBeNull();
  });
});

describe('versions and tags', () => {
  it('reads the version from app.config.js', () => {
    expect(readAppVersion("    slug: 'ut-dining',\n    version: '2.0.0',\n")).toBe('2.0.0');
    expect(() => readAppVersion('export default {}')).toThrow();
  });

  it('finds the newest tag older than the version', () => {
    const tags = ['v1.2.4', 'v2.0.0', 'v2.1.0', 'v10.0.0', 'nightly', ''];
    expect(previousTag(tags, '2.1.0')).toBe('v2.0.0');
    expect(previousTag(tags, '11.0.0')).toBe('v10.0.0');
    expect(previousTag(tags, '1.0.0')).toBeNull();
    expect(tagFor('2.0.0')).toBe('v2.0.0');
  });
});

describe('releaseNotes', () => {
  const commits = [
    commit('fix(mobile): match the splash screen to the theme (#66)'),
    commit('feat(dashboard): lead the status page with a verdict (#61)'),
    commit('ci: auto-label PRs (#56)'),
    commit('perf(mobile): remove menu switch delay (#31)'),
    commit('feat!: rename the menus table (#90)'),
    commit('Update README.md'),
  ];

  it('groups commits into sections in a fixed order', () => {
    const notes = releaseNotes({ version: '2.1.0', commits, repo: 'o/r', previous: 'v2.0.0' });
    const headings = notes.split('\n').filter((line) => line.startsWith('## '));
    expect(headings).toEqual([
      '## Breaking changes',
      '## Features',
      '## Fixes',
      '## Performance',
      '## Maintenance',
    ]);
    expect(notes).toContain(
      '- **dashboard:** lead the status page with a verdict ([#61](https://github.com/o/r/pull/61))',
    );
    expect(notes).toContain('Plus 1 commit without a conventional title.');
    expect(notes).toContain('https://github.com/o/r/compare/v2.0.0...v2.1.0');
  });

  it('lists a breaking change only once', () => {
    const notes = releaseNotes({ version: '2.1.0', commits, repo: 'o/r', previous: null });
    expect(notes.match(/rename the menus table/g)).toHaveLength(1);
    expect(notes).not.toContain('Full diff');
  });

  it('says so when there is nothing to list', () => {
    expect(releaseNotes({ version: '2.1.0', commits: [], repo: 'o/r', previous: null })).toContain(
      'No conventional commits',
    );
  });
});

describe('changelogDraft', () => {
  it('keeps only app changes and merges fixes into one item', () => {
    const draft = changelogDraft([
      commit('feat(mobile): show cached menus first (#30)'),
      commit('feat(dashboard): google-only sign-in (#46)'),
      commit('perf(mobile): remove menu switch delay. (#31)'),
      commit('fix(mobile): show food details for the selected date (#20)'),
      commit('fix(mobile): replace the open map sheet (#21)'),
      commit('fix(scraper): keep allergens (#22)'),
    ]);
    expect(draft).toEqual({
      summary: null,
      release_date: null,
      is_published: false,
      changes: [
        { icon: 'sparkles', title: 'Show cached menus first' },
        { icon: 'zap', title: 'Remove menu switch delay' },
        {
          icon: 'wrench',
          title: 'Fixes',
          description: 'Show food details for the selected date. Replace the open map sheet.',
        },
      ],
    });
  });

  it('uses a single fix as its own item', () => {
    expect(changelogDraft([commit('fix(mobile): stop a crash (#9)')]).changes).toEqual([
      { icon: 'wrench', title: 'Stop a crash' },
    ]);
  });

  it('falls back to a generic item when no app change is listed', () => {
    expect(changelogDraft([commit('ci: speed up builds (#71)')]).changes).toEqual([
      { icon: 'wrench', title: 'Performance improvements and bug fixes' },
    ]);
  });
});
