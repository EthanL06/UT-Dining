import { type Hhmm, WEEKDAYS, type Weekday } from './hours.ts';

/** UT Austin's time zone. Menus and service hours are all in Central time. */
export const CENTRAL_TIME_ZONE = 'America/Chicago';

export interface ZonedNow {
  /** Calendar date, YYYY-MM-DD, as menus are keyed in Supabase. */
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

/** The Central-time calendar date, weekday and HHMM time of an instant. Handles DST. */
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

/** The weekday and HHMM time of a Date in the device's own time zone. */
export const toLocalTime = (date: Date): Omit<ZonedNow, 'date'> => ({
  day: WEEKDAYS[date.getDay()],
  time: date.getHours() * 100 + date.getMinutes(),
});
