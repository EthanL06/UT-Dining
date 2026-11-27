import type { Hhmm, Weekday } from './hours.ts';

export const CENTRAL_TIME_ZONE = 'America/Chicago';

export interface ZonedNow {
  date: string;
  day: Weekday;
  time: Hhmm;
}

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CENTRAL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'long',
});

export const toCentralTime = (instant: Date = new Date()): ZonedNow => {
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    day: parts.weekday.toLowerCase() as Weekday,
    time: Number(parts.hour) * 100 + Number(parts.minute),
  };
};

const DAY_MS = 86_400_000;

export const formatCentral = (
  instant: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string => new Date(instant).toLocaleString('en-US', { ...options, timeZone: CENTRAL_TIME_ZONE });

export const formatCentralDateKey = (
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
): string => formatCentral(`${dateKey}T12:00:00Z`, options);

export const daysBetweenDateKeys = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
