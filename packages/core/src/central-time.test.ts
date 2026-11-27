import { describe, expect, it } from 'vitest';

import {
  daysBetweenDateKeys,
  formatCentral,
  formatCentralDateKey,
  toCentralTime,
} from './central-time.ts';

describe('toCentralTime', () => {
  it('converts during daylight saving time (UTC-5)', () => {
    expect(toCentralTime(new Date('2026-10-25T17:23:00Z'))).toEqual({
      date: '2026-10-25',
      day: 'sunday',
      time: 1223,
    });
  });

  it('converts during standard time (UTC-6)', () => {
    expect(toCentralTime(new Date('2026-01-15T14:05:00Z'))).toEqual({
      date: '2026-01-15',
      day: 'thursday',
      time: 805,
    });
  });

  it('keeps the previous calendar day late in the evening', () => {
    expect(toCentralTime(new Date('2026-10-31T03:30:00Z'))).toEqual({
      date: '2026-10-30',
      day: 'friday',
      time: 2230,
    });
  });

  it('reports midnight as 0', () => {
    expect(toCentralTime(new Date('2026-10-26T05:00:00Z')).time).toBe(0);
  });
});

describe('formatCentral', () => {
  it('formats an instant in Central time whatever the device zone', () => {
    expect(formatCentral('2026-11-27T05:30:00Z', { hour: 'numeric', minute: '2-digit' })).toBe(
      '11:30 PM',
    );
    expect(formatCentral('2026-11-27T05:30:00Z', { month: 'short', day: 'numeric' })).toBe(
      'Nov 26',
    );
  });
});

describe('formatCentralDateKey', () => {
  it('keeps the calendar day of the key', () => {
    expect(formatCentralDateKey('2026-11-01', { month: 'long', year: 'numeric' })).toBe(
      'November 2026',
    );
    expect(
      formatCentralDateKey('2026-03-08', { weekday: 'long', month: 'short', day: 'numeric' }),
    ).toBe('Sunday, Mar 8');
  });
});

describe('daysBetweenDateKeys', () => {
  it('counts calendar days across a DST change', () => {
    expect(daysBetweenDateKeys('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetweenDateKeys('2026-11-27', '2026-11-26')).toBe(-1);
  });
});
