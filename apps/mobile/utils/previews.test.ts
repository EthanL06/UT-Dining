import { describe, expect, it } from 'vitest';
import {
  formatPreviewAge,
  isCompatiblePreview,
  isReplayedLaunchLink,
  keepOpenPreviews,
  openPullRequestsUrl,
  parseOpenPrNumbers,
  parsePreviews,
  parsePrNumber,
  previewsUrl,
  pullRequestUrl,
} from './previews';

describe('previewsUrl', () => {
  it('builds the public storage URL', () => {
    expect(previewsUrl('https://abc.supabase.co/')).toBe(
      'https://abc.supabase.co/storage/v1/object/public/qa-previews/previews.json',
    );
  });

  it('returns null without a Supabase URL', () => {
    expect(previewsUrl(undefined)).toBeNull();
  });
});

describe('parsePreviews', () => {
  it('keeps valid entries, fills defaults and sorts newest first', () => {
    const previews = parsePreviews({
      previews: [
        { pr: 70, title: 'Old', updatedAt: '2026-11-27T06:00:00Z', runtime: 'a' },
        { pr: 75, updatedAt: '2026-11-27T08:00:00Z' },
        { pr: 'x' },
        null,
      ],
    });
    expect(previews.map((preview) => preview.pr)).toEqual([75, 70]);
    expect(previews[0]).toMatchObject({ title: 'PR #75', channel: 'pr-75', runtime: '' });
  });

  it('returns nothing for malformed input', () => {
    expect(parsePreviews(null)).toEqual([]);
    expect(parsePreviews({ previews: 'nope' })).toEqual([]);
  });
});

describe('parsePrNumber', () => {
  it('accepts digits with an optional #', () => {
    expect(parsePrNumber(' #75 ')).toBe(75);
    expect(parsePrNumber(['12'])).toBe(12);
  });

  it('rejects anything else', () => {
    expect(parsePrNumber('0')).toBeNull();
    expect(parsePrNumber('7a')).toBeNull();
    expect(parsePrNumber(undefined)).toBeNull();
  });
});

describe('isCompatiblePreview', () => {
  const preview = parsePreviews({ previews: [{ pr: 1, runtime: 'abc' }] })[0];

  it('matches on runtime version', () => {
    expect(isCompatiblePreview(preview, 'abc')).toBe(true);
    expect(isCompatiblePreview(preview, 'def')).toBe(false);
    expect(isCompatiblePreview(preview, null)).toBe(true);
  });
});

describe('formatPreviewAge', () => {
  const now = Date.parse('2026-11-27T10:00:00Z');

  it('formats minutes, hours and days', () => {
    expect(formatPreviewAge('2026-11-27T09:59:50Z', now)).toBe('just now');
    expect(formatPreviewAge('2026-11-27T09:45:00Z', now)).toBe('15 min ago');
    expect(formatPreviewAge('2026-11-27T07:00:00Z', now)).toBe('3 h ago');
    expect(formatPreviewAge('2026-11-25T10:00:00Z', now)).toBe('2 d ago');
    expect(formatPreviewAge('bad', now)).toBe('unknown');
  });
});

describe('isReplayedLaunchLink', () => {
  it('treats a launch link right after an in-app reload as a replay', () => {
    expect(isReplayedLaunchLink(1_000, 6_000)).toBe(true);
  });

  it('handles the link when no reload happened or the reload is old', () => {
    expect(isReplayedLaunchLink(undefined, 6_000)).toBe(false);
    expect(isReplayedLaunchLink(1_000, 120_000)).toBe(false);
    expect(isReplayedLaunchLink(9_000, 6_000)).toBe(false);
  });
});

describe('open PR filtering', () => {
  const preview = (pr: number) => ({
    pr,
    title: `PR #${pr}`,
    channel: `pr-${pr}`,
    sha: '',
    runtime: '',
    buildUrl: '',
    updatedAt: '',
  });

  it('reads PR numbers from the GitHub pulls response', () => {
    expect(parseOpenPrNumbers([{ number: 161 }, { number: 'x' }, null, { number: 134 }])).toEqual([
      161, 134,
    ]);
    expect(parseOpenPrNumbers({ message: 'API rate limit exceeded' })).toBeNull();
  });

  it('drops previews whose PR is merged or closed', () => {
    const list = [preview(161), preview(106), preview(134)];
    expect(keepOpenPreviews(list, new Set([161, 134])).map((item) => item.pr)).toEqual([161, 134]);
  });

  it('keeps every preview when PR state is unknown', () => {
    const list = [preview(161), preview(106)];
    expect(keepOpenPreviews(list, null)).toBe(list);
  });

  it('builds GitHub URLs', () => {
    expect(pullRequestUrl(161)).toBe('https://github.com/EthanL06/UT-Dining/pull/161');
    expect(openPullRequestsUrl(2)).toBe(
      'https://api.github.com/repos/EthanL06/UT-Dining/pulls?state=open&per_page=100&page=2',
    );
  });
});
