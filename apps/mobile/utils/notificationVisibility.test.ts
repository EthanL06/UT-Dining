import { describe, expect, it } from 'vitest';
import { isNotificationVisible, resolveVisibleSince } from './notificationVisibility';

const now = Date.parse('2026-11-27T08:00:00Z');

describe('resolveVisibleSince', () => {
  it('keeps a stored cutoff', () => {
    expect(resolveVisibleSince(123, false, now)).toBe(123);
    expect(resolveVisibleSince(0, false, now)).toBe(0);
  });

  it('shows full history to existing users', () => {
    expect(resolveVisibleSince(undefined, true, now)).toBe(0);
  });

  it('starts new users at install time', () => {
    expect(resolveVisibleSince(undefined, false, now)).toBe(now);
  });
});

describe('isNotificationVisible', () => {
  it('shows everything when there is no cutoff', () => {
    expect(isNotificationVisible('2025-01-01T00:00:00Z', 0)).toBe(true);
    expect(isNotificationVisible(null, 0)).toBe(true);
  });

  it('hides notifications sent before the cutoff', () => {
    expect(isNotificationVisible('2026-11-27T07:59:59Z', now)).toBe(false);
    expect(isNotificationVisible('2026-11-27 07:00:00+00', now)).toBe(false);
  });

  it('shows notifications sent at or after the cutoff', () => {
    expect(isNotificationVisible('2026-11-27T08:00:00Z', now)).toBe(true);
    expect(isNotificationVisible('2026-11-28T00:00:00Z', now)).toBe(true);
  });

  it('hides undated or unparseable notifications for new users', () => {
    expect(isNotificationVisible(null, now)).toBe(false);
    expect(isNotificationVisible('not a date', now)).toBe(false);
  });
});
