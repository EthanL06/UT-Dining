import { describe, expect, it } from 'vitest';
import { type CheckedLocation, getHourProblems, isOpenNow } from './location-checks';

const day = (open: number, close: number) => ({
  timeRanges: [{ open, close }],
  isClosed: false,
});
const closed = { timeRanges: [], isClosed: true };

const location = (overrides: Partial<CheckedLocation> = {}): CheckedLocation => ({
  id: 'j2',
  name: 'J2 Dining',
  has_menus: false,
  force_close: false,
  regular_service_hours: {
    monday: day(700, 2000),
    tuesday: closed,
    wednesday: closed,
    thursday: closed,
    friday: closed,
    saturday: closed,
    sunday: closed,
  },
  meal_times: [],
  ...overrides,
});

describe('isOpenNow', () => {
  it('is open inside the hours and closed when forced closed', () => {
    expect(isOpenNow(location(), 'monday', 1200)).toBe(true);
    expect(isOpenNow(location(), 'tuesday', 1200)).toBe(false);
    expect(isOpenNow(location({ force_close: true }), 'monday', 1200)).toBe(false);
  });
});

describe('getHourProblems', () => {
  it('finds nothing wrong with normal hours', () => {
    expect(getHourProblems(location())).toEqual([]);
  });

  it('flags a place that is never open', () => {
    const hours = Object.fromEntries(
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => [
        d,
        closed,
      ]),
    );
    expect(getHourProblems(location({ regular_service_hours: hours }))).toContain(
      'No open hours on any day',
    );
  });

  it('flags hours that close before they open', () => {
    const hours = {
      ...(location().regular_service_hours as object),
      monday: day(2000, 700),
    };
    expect(getHourProblems(location({ regular_service_hours: hours }))).toContain(
      'Closes before it opens on Monday',
    );
  });

  it('flags a menu location with no meal times', () => {
    expect(getHourProblems(location({ has_menus: true }))).toEqual(['Has menus but no meal times']);
  });
});
