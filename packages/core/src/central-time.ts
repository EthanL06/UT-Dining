import { type Hhmm, WEEKDAYS, type Weekday } from './hours.ts';

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

export const toLocalTime = (date: Date): Omit<ZonedNow, 'date'> => ({
  day: WEEKDAYS[date.getDay()],
  time: date.getHours() * 100 + date.getMinutes(),
});
