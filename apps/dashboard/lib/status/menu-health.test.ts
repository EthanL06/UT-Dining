import { describe, expect, it } from 'vitest';
import {
  addDays,
  getDayHealth,
  getScrapeHealth,
  isExpectedOn,
  type StatusLocation,
  weekdayOf,
  worstHealth,
} from './menu-health';

const weekdays = {
  timeRanges: [{ open: 700, close: 2000 }],
  isClosed: false,
};
const closed = { timeRanges: [], isClosed: true };

const hall = (overrides: Partial<StatusLocation> = {}): StatusLocation => ({
  id: 'j2',
  name: 'J2 Dining',
  has_menus: true,
  force_close: false,
  regular_service_hours: {
    monday: weekdays,
    tuesday: weekdays,
    wednesday: weekdays,
    thursday: weekdays,
    friday: weekdays,
    saturday: closed,
    sunday: closed,
  },
  ...overrides,
});

const HOUR = 60 * 60 * 1000;
const now = Date.parse('2026-11-27T12:00:00Z');
const format = (value: string) => value;

describe('dates', () => {
  it('reads the weekday of a date and adds days across months', () => {
    expect(weekdayOf('2026-11-27')).toBe('friday');
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
  });
});

describe('isExpectedOn', () => {
  it('expects a menu on an open day only', () => {
    expect(isExpectedOn(hall(), '2026-11-27', '2026-11-27')).toBe(true);
    expect(isExpectedOn(hall(), '2026-11-28', '2026-11-27')).toBe(false);
  });

  it('skips places without menus and today when force closed', () => {
    expect(isExpectedOn(hall({ has_menus: false }), '2026-11-27', '2026-11-27')).toBe(false);
    expect(isExpectedOn(hall({ force_close: true }), '2026-11-27', '2026-11-27')).toBe(false);
    expect(isExpectedOn(hall({ force_close: true }), '2026-11-30', '2026-11-27')).toBe(true);
  });
});

describe('getDayHealth', () => {
  it('lists expected locations that have no menu', () => {
    const health = getDayHealth(
      { date: '2026-11-27', location_ids: [] },
      [hall(), hall({ id: 'jcl', name: null })],
      '2026-11-27',
      '2026-11-25',
    );
    expect(health).toMatchObject({
      expected: 2,
      loaded: 0,
      missing: ['J2 Dining', 'Unnamed location'],
      complete: false,
      health: 'operational',
    });
  });

  it('is unknown before the oldest stored menu or when nothing is expected', () => {
    const day = { date: '2026-11-27', location_ids: ['j2'] };
    expect(getDayHealth(day, [hall()], '2026-11-27', '2026-11-28').health).toBe('unknown');
    expect(getDayHealth(day, [hall()], '2026-11-27', null).health).toBe('unknown');
    expect(getDayHealth(day, [], '2026-11-27', '2026-11-25').health).toBe('unknown');
  });
});

describe('getScrapeHealth', () => {
  it('reports a failed run as an outage', () => {
    const run = { health: 'outage' as const, startedAt: new Date(now - HOUR).toISOString() };
    expect(getScrapeHealth(run, null, now, format).health).toBe('outage');
  });

  it('degrades when the last run is over 30 hours old', () => {
    const startedAt = new Date(now - 31 * HOUR).toISOString();
    const result = getScrapeHealth({ health: 'operational', startedAt }, null, now, format);
    expect(result).toEqual({
      health: 'degraded',
      detail: `Menus haven't been updated since ${startedAt}.`,
    });
  });

  it('falls back to the last menu write when there is no run', () => {
    expect(getScrapeHealth(null, null, now, format).health).toBe('outage');
    const old = new Date(now - 49 * HOUR).toISOString();
    expect(getScrapeHealth(null, old, now, format).health).toBe('degraded');
    const recent = new Date(now - 2 * HOUR).toISOString();
    expect(getScrapeHealth(null, recent, now, format)).toEqual({
      health: 'operational',
      detail: null,
    });
  });
});

describe('worstHealth', () => {
  it('ignores unknown and picks the worst known value', () => {
    expect(worstHealth(['unknown', 'unknown'])).toBe('unknown');
    expect(worstHealth(['operational', 'unknown'])).toBe('operational');
    expect(worstHealth(['operational', 'degraded'])).toBe('degraded');
    expect(worstHealth(['degraded', 'outage', 'unknown'])).toBe('outage');
  });
});
