import { describe, expect, it } from 'vitest';
import { describeDownloads, formatAgo, formatBytes, runLabel, toQueryView } from './adminView';

describe('toQueryView', () => {
  it('keeps loading apart from an error and from data', () => {
    expect(toQueryView({ isPending: true, isError: false, data: undefined })).toEqual({
      status: 'loading',
    });
    expect(toQueryView({ isPending: false, isError: true, data: undefined })).toEqual({
      status: 'error',
    });
    expect(toQueryView({ isPending: false, isError: false, data: [] })).toEqual({
      status: 'ready',
      data: [],
    });
  });

  it('keeps showing data when a refetch fails', () => {
    expect(toQueryView({ isPending: false, isError: true, data: 1 })).toEqual({
      status: 'ready',
      data: 1,
    });
  });
});

describe('runLabel', () => {
  it.each([
    [{ status: 'queued', conclusion: null }, 'Queued'],
    [{ status: 'in_progress', conclusion: null }, 'Running'],
    [{ status: 'completed', conclusion: 'success' }, 'Succeeded'],
    [{ status: 'completed', conclusion: 'failure' }, 'Failed'],
    [{ status: 'completed', conclusion: 'cancelled' }, 'Cancelled'],
    [{ status: 'completed', conclusion: 'skipped' }, 'Finished'],
  ] as const)('%o is %s', (run, label) => {
    expect(runLabel(run)).toBe(label);
  });
});

describe('formatAgo', () => {
  const now = Date.parse('2026-11-27T21:00:00Z');

  it('counts minutes and hours, then shows a Central date', () => {
    expect(formatAgo(null, now)).toBe('Never');
    expect(formatAgo('2026-11-27T20:59:40Z', now)).toBe('Just now');
    expect(formatAgo('2026-11-27T20:35:00Z', now)).toBe('25 min ago');
    expect(formatAgo('2026-11-27T15:00:00Z', now)).toBe('6 h ago');
    expect(formatAgo('2026-11-25T13:30:00Z', now)).toBe('Nov 25, 7:30 AM');
  });
});

describe('formatBytes', () => {
  it('rounds to KB or MB', () => {
    expect(formatBytes(null)).toBe('Unknown');
    expect(formatBytes(4_200)).toBe('4 KB');
    expect(formatBytes(80_400_000)).toBe('80 MB');
  });
});

describe('describeDownloads', () => {
  const now = Date.parse('2026-11-27T21:00:00Z');

  it('shows the total with thousands separators', () => {
    expect(
      describeDownloads({ status: 'ready', total: 12345, checkedAt: '2026-11-27T20:30:00Z' }, now),
    ).toEqual({
      value: '12,345',
      footer:
        'First-time downloads of all versions. Apple updates this once a day. Checked 30 min ago.',
    });
  });

  it('names the missing settings', () => {
    expect(
      describeDownloads({ status: 'not_configured', missing: ['ADMIN_ASC_VENDOR_NUMBER'] }),
    ).toEqual({ value: 'Not set up', footer: 'Still missing: ADMIN_ASC_VENDOR_NUMBER.' });
  });

  it('passes on what Apple said', () => {
    expect(describeDownloads({ status: 'failed', detail: 'Apple answered 401' })).toEqual({
      value: "Couldn't load",
      footer: 'Apple answered 401',
    });
  });
});
