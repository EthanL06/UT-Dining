import { describe, expect, it } from 'vitest';
import { parseQaClock } from './qaClockTarget';

const REAL_NOW = Date.parse('2026-11-27T18:09:00Z');

describe('parseQaClock', () => {
  it('ignores a link without a clock', () => {
    expect(parseQaClock({}, REAL_NOW)).toEqual({ kind: 'none' });
  });

  it('turns the clock off', () => {
    expect(parseQaClock({ clock: 'off' }, REAL_NOW)).toEqual({ kind: 'off' });
  });

  it('sets a Central time on the Central date of today', () => {
    expect(parseQaClock({ clock: '12:30' }, REAL_NOW)).toEqual({
      kind: 'set',
      at: Date.parse('2026-11-27T18:30:00Z'),
    });
  });

  it('uses the Central date when UTC has already moved to the next day', () => {
    const lateEvening = Date.parse('2026-11-28T03:00:00Z');
    expect(parseQaClock({ clock: '20:30' }, lateEvening)).toEqual({
      kind: 'set',
      at: Date.parse('2026-11-28T02:30:00Z'),
    });
  });

  it('moves the date by whole days', () => {
    expect(parseQaClock({ clock: '08:00', days: '3' }, REAL_NOW)).toEqual({
      kind: 'set',
      at: Date.parse('2026-11-30T14:00:00Z'),
    });
  });

  it('rejects a malformed time or day count', () => {
    expect(parseQaClock({ clock: '25:00' }, REAL_NOW)).toEqual({ kind: 'none' });
    expect(parseQaClock({ clock: '9:00' }, REAL_NOW)).toEqual({ kind: 'none' });
    expect(parseQaClock({ clock: '09:00', days: 'x' }, REAL_NOW)).toEqual({ kind: 'none' });
  });
});
