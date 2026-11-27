import { describe, expect, it } from 'vitest';

import type * as schema from '~/services/database/schema';

import {
  formatTimeSinceSync,
  generateSchedule,
  getLocationStatusText,
  getLocationTimeMessage,
  isLocationOpen,
  timeOfDay,
} from './time';

const open = (close: number) => ({ isClosed: false, timeRanges: [{ open: 700, close }] });
const weekday = open(2100);
const closed = { isClosed: true, timeRanges: [] };

const location = (overrides: Partial<schema.Location> = {}): schema.Location =>
  ({
    force_close: false,
    regular_service_hours: {
      monday: weekday,
      tuesday: weekday,
      wednesday: weekday,
      thursday: weekday,
      friday: open(1400),
      saturday: closed,
      sunday: closed,
    },
    ...overrides,
  }) as unknown as schema.Location;

const at = (isoLocal: string) => new Date(isoLocal);

describe('timeOfDay', () => {
  it('uses fixed cutoffs without meal times', () => {
    expect(timeOfDay(at('2026-11-23T10:59:00'))).toBe('morning');
    expect(timeOfDay(at('2026-11-23T11:00:00'))).toBe('afternoon');
    expect(timeOfDay(at('2026-11-23T17:00:00'))).toBe('evening');
  });

  it('uses the meal close times when given', () => {
    const mealTimes = { breakfast: { closeTime: 1000 }, lunch: { closeTime: 1400 } };
    expect(timeOfDay(at('2026-11-23T10:30:00'), mealTimes as never)).toBe('afternoon');
    expect(timeOfDay(at('2026-11-23T14:30:00'), mealTimes as never)).toBe('evening');
  });
});

describe('isLocationOpen', () => {
  it('is open inside the hours and closed outside them', () => {
    expect(isLocationOpen(location(), at('2026-11-23T12:00:00'))).toBe(true);
    expect(isLocationOpen(location(), at('2026-11-23T06:59:00'))).toBe(false);
    expect(isLocationOpen(location(), at('2026-11-28T12:00:00'))).toBe(false);
  });

  it('is closed when forced closed', () => {
    expect(isLocationOpen(location({ force_close: true }), at('2026-11-23T12:00:00'))).toBe(false);
  });

  it('is closed with no location', () => {
    expect(isLocationOpen(null, at('2026-11-23T12:00:00'))).toBe(false);
  });
});

describe('getLocationTimeMessage', () => {
  it('counts down to closing and to opening', () => {
    expect(getLocationTimeMessage(location(), at('2026-11-23T20:30:00'))).toBe(
      'Open for 30 minutes',
    );
    expect(getLocationTimeMessage(location(), at('2026-11-23T12:00:00'))).toBe('Open for 9 hours');
    expect(getLocationTimeMessage(location(), at('2026-11-23T06:59:00'))).toBe('Opens in 1 minute');
  });

  it('says closed on a day with no hours', () => {
    expect(getLocationTimeMessage(location(), at('2026-11-28T12:00:00'))).toBe('Closed');
  });
});

describe('generateSchedule', () => {
  it('groups days with the same hours', () => {
    expect(generateSchedule(location(), true)).toEqual([
      { dayRange: 'M-TH', time: '07:00 AM - 09:00 PM' },
      { dayRange: 'Fri', time: '07:00 AM - 02:00 PM' },
      { dayRange: 'Sat-Sun', time: 'Closed' },
    ]);
  });

  it('formats noon, half hours and the end of the day', () => {
    const late = { isClosed: false, timeRanges: [{ open: 1230, close: 2400 }] };
    const regular_service_hours = Object.fromEntries(
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [
        day,
        late,
      ]),
    );
    const everyDay = location({ regular_service_hours } as Partial<schema.Location>);
    expect(generateSchedule(everyDay)).toEqual([
      { dayRange: 'M-Sun', time: '12:30 PM - 12:00 AM' },
    ]);
  });

  it('is empty with no hours', () => {
    expect(generateSchedule(null)).toEqual([]);
  });
});

describe('formatTimeSinceSync', () => {
  it.each([
    [Infinity, 'Never synced'],
    [30_000, 'Just now'],
    [60_000, '1 minute ago'],
    [2 * 3_600_000, '2 hours ago'],
    [86_400_000, '1 day ago'],
  ])('%s ms is %s', (ms, expected) => {
    expect(formatTimeSinceSync(ms)).toBe(expected);
  });
});

describe('getLocationStatusText', () => {
  it('says closed today when a hall has no menu during its hours', () => {
    expect(getLocationStatusText(location(), false, at('2026-11-23T12:00:00'))).toBe(
      'Closed today',
    );
  });
});
