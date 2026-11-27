import { describe, expect, it } from 'vitest';
import { checkNotification, NOTIFICATION_TITLE_MAX } from './notifications.ts';

const now = new Date('2026-11-27T12:00:00Z');

describe('checkNotification', () => {
  it('trims text and keeps an app path or https link', () => {
    expect(
      checkNotification({ title: ' Hi ', body: ' There ', redirectUrl: ' /location/J2 ' }, now),
    ).toEqual({
      ok: true,
      value: { title: 'Hi', body: 'There', redirectUrl: '/location/J2', scheduledAt: null },
    });
    expect(
      checkNotification({ title: 'a', body: 'b', redirectUrl: 'https://utdining.app' }, now).ok,
    ).toBe(true);
    expect(checkNotification({ title: 'a', body: 'b', redirectUrl: '' }, now)).toMatchObject({
      ok: true,
      value: { redirectUrl: null },
    });
  });

  it('rejects empty or long text', () => {
    expect(checkNotification({ title: ' ', body: 'b' }, now).ok).toBe(false);
    expect(checkNotification({ title: 'a', body: '' }, now).ok).toBe(false);
    expect(
      checkNotification({ title: 'x'.repeat(NOTIFICATION_TITLE_MAX + 1), body: 'b' }, now).ok,
    ).toBe(false);
  });

  it('rejects a link the app cannot open', () => {
    expect(checkNotification({ title: 'a', body: 'b', redirectUrl: 'utdining.app' }, now)).toEqual({
      ok: false,
      error: 'The link must be an app path like /location/J2 or an https:// URL.',
    });
  });

  it('requires a valid future time for a scheduled push', () => {
    expect(
      checkNotification({ title: 'a', body: 'b', scheduledAt: '2026-11-27T11:59:00Z' }, now).ok,
    ).toBe(false);
    expect(checkNotification({ title: 'a', body: 'b', scheduledAt: 'soon' }, now).ok).toBe(false);
    const later = checkNotification({ title: 'a', body: 'b', scheduledAt: '2026-11-28' }, now);
    expect(later.ok && later.value.scheduledAt?.toISOString()).toBe('2026-11-28T00:00:00.000Z');
  });
});
