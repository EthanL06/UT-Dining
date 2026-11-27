import { getOpenRanges, type ServiceHours, WEEKDAYS, type Weekday } from '@ut-dining/core';

export type Health = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface StatusLocation {
  id: string;
  name: string | null;
  has_menus: boolean | null;
  force_close: boolean;
  regular_service_hours: unknown;
}

export interface MenuDay {
  date: string;
  location_ids: string[];
}

export interface DayHealth {
  date: string;
  expected: number;
  loaded: number;
  missing: string[];
  complete: boolean;
  health: Health;
}

export const weekdayOf = (date: string): Weekday =>
  WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

export const addDays = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const isExpectedOn = (location: StatusLocation, date: string, today: string): boolean => {
  if (location.has_menus !== true) return false;
  if (date === today && location.force_close) return false;
  return getOpenRanges(location.regular_service_hours as ServiceHours, weekdayOf(date)) !== null;
};

export const getDayHealth = (
  day: MenuDay,
  locations: StatusLocation[],
  today: string,
  oldestMenuDate: string | null = null,
): DayHealth => {
  const loadedIds = new Set(day.location_ids);
  const expected = locations.filter((location) => isExpectedOn(location, day.date, today));
  const missing = expected
    .filter((location) => !loadedIds.has(location.id))
    .map((location) => location.name ?? 'Unnamed location');
  const loaded = expected.length - missing.length;

  const health: Health =
    expected.length === 0 || !oldestMenuDate || day.date < oldestMenuDate
      ? 'unknown'
      : 'operational';

  return {
    date: day.date,
    expected: expected.length,
    loaded,
    missing,
    complete: missing.length === 0,
    health,
  };
};

export interface ScrapeSignal {
  health: Health;
  startedAt: string | null;
}

export interface ScrapeHealth {
  health: Health;
  detail: string | null;
}

const HOUR = 60 * 60 * 1000;

const ageHours = (value: string, now: number) => (now - Date.parse(value)) / HOUR;

export const getScrapeHealth = (
  run: ScrapeSignal | null,
  lastMenuWrite: string | null,
  now: number,
  formatTime: (value: string) => string,
): ScrapeHealth => {
  if (run?.startedAt) {
    if (run.health === 'outage') {
      return { health: 'outage', detail: 'The last menu update failed.' };
    }
    if (ageHours(run.startedAt, now) > 30) {
      return {
        health: 'degraded',
        detail: `Menus haven't been updated since ${formatTime(run.startedAt)}.`,
      };
    }
    return { health: 'operational', detail: null };
  }
  if (!lastMenuWrite) return { health: 'outage', detail: 'There are no menus yet.' };
  if (ageHours(lastMenuWrite, now) > 48) {
    return {
      health: 'degraded',
      detail: `Menus haven't been updated since ${formatTime(lastMenuWrite)}.`,
    };
  }
  return { health: 'operational', detail: null };
};

export const worstHealth = (values: Health[]): Health => {
  const known = values.filter((value) => value !== 'unknown');
  if (known.length === 0) return 'unknown';
  if (known.includes('outage')) return 'outage';
  if (known.includes('degraded')) return 'degraded';
  return 'operational';
};
