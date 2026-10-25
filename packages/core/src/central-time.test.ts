import { describe, expect, it } from 'vitest';

import { toCentralTime, toLocalTime } from './central-time.ts';

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
    // 03:30 UTC on Saturday is 10:30 PM Friday in Austin.
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

describe('toLocalTime', () => {
  it('reads the weekday and time in the device time zone', () => {
    expect(toLocalTime(new Date(2026, 9, 26, 9, 15))).toEqual({ day: 'monday', time: 915 });
  });
});
