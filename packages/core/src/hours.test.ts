import { describe, expect, it } from 'vitest';

import {
  formatHhmm,
  getNextOpening,
  getOpenRanges,
  isOpenAt,
  type ServiceHours,
  toMinutes,
  WEEKDAYS,
} from './hours.ts';

const closed = { isClosed: true, timeRanges: [] };
const weekday = {
  isClosed: false,
  timeRanges: [
    { open: 700, close: 1030 },
    { open: 1100, close: 2100 },
  ],
};
const hours: ServiceHours = {
  monday: weekday,
  tuesday: weekday,
  wednesday: weekday,
  thursday: weekday,
  friday: { isClosed: false, timeRanges: [{ open: 700, close: 1400 }] },
  saturday: closed,
  sunday: { isClosed: false, timeRanges: [{ open: 1200, close: 2000 }] },
};

describe('toMinutes / formatHhmm', () => {
  it('converts HHMM', () => {
    expect(toMinutes(0)).toBe(0);
    expect(toMinutes(1430)).toBe(870);
    expect(toMinutes(2359)).toBe(1439);
  });

  it('formats HHMM for display', () => {
    expect(formatHhmm(0)).toBe('12:00 AM');
    expect(formatHhmm(905)).toBe('9:05 AM');
    expect(formatHhmm(1200)).toBe('12:00 PM');
    expect(formatHhmm(1430)).toBe('2:30 PM');
  });
});

describe('getOpenRanges', () => {
  it('returns null for closed, empty or missing days', () => {
    expect(getOpenRanges(hours, 'saturday')).toBeNull();
    expect(getOpenRanges({ monday: { isClosed: false, timeRanges: [] } }, 'monday')).toBeNull();
    expect(getOpenRanges({}, 'monday')).toBeNull();
    expect(getOpenRanges(null, 'monday')).toBeNull();
  });

  it('returns the ranges of an open day', () => {
    expect(getOpenRanges(hours, 'friday')).toEqual([{ open: 700, close: 1400 }]);
  });
});

describe('isOpenAt', () => {
  it('is open from the opening minute up to, not including, the closing minute', () => {
    expect(isOpenAt(hours, 'monday', 659)).toBe(false);
    expect(isOpenAt(hours, 'monday', 700)).toBe(true);
    expect(isOpenAt(hours, 'monday', 1029)).toBe(true);
    expect(isOpenAt(hours, 'monday', 1030)).toBe(false);
  });

  it('handles gaps between ranges', () => {
    expect(isOpenAt(hours, 'tuesday', 1045)).toBe(false);
    expect(isOpenAt(hours, 'tuesday', 1100)).toBe(true);
  });

  it('is closed on closed days', () => {
    expect(isOpenAt(hours, 'saturday', 1200)).toBe(false);
  });
});

describe('getNextOpening', () => {
  it('finds a later range today', () => {
    expect(getNextOpening(hours, 'monday', 1045)).toEqual({
      day: 'monday',
      daysFromNow: 0,
      open: 1100,
    });
  });

  it('skips closed days', () => {
    expect(getNextOpening(hours, 'friday', 1500)).toEqual({
      day: 'sunday',
      daysFromNow: 2,
      open: 1200,
    });
  });

  it('wraps around the week', () => {
    expect(getNextOpening(hours, 'sunday', 2100)).toEqual({
      day: 'monday',
      daysFromNow: 1,
      open: 700,
    });
  });

  it('returns null when nothing opens in the next week', () => {
    const allClosed = Object.fromEntries(
      WEEKDAYS.map((day) => [day, closed]),
    ) as unknown as ServiceHours;
    expect(getNextOpening(allClosed, 'monday', 800)).toBeNull();
  });
});
