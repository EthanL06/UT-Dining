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

  let health: Health = 'operational';
  if (expected.length === 0 || !oldestMenuDate || day.date < oldestMenuDate) health = 'unknown';
  else if (missing.length > 0) health = 'degraded';

  return { date: day.date, expected: expected.length, loaded, missing, health };
};

export const getFreshnessHealth = (latestMenuDate: string | null, today: string): Health => {
  if (!latestMenuDate) return 'outage';
  if (latestMenuDate < today) return 'outage';
  if (latestMenuDate < addDays(today, 1)) return 'degraded';
  return 'operational';
};

export const worstHealth = (values: Health[]): Health => {
  const known = values.filter((value) => value !== 'unknown');
  if (known.length === 0) return 'unknown';
  if (known.includes('outage')) return 'outage';
  if (known.includes('degraded')) return 'degraded';
  return 'operational';
};
