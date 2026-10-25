/** A time of day written as an HHMM number, e.g. 1430 for 2:30 PM. Stored this way in Supabase. */
export type Hhmm = number;

export interface TimeRange {
  open: Hhmm;
  close: Hhmm;
}

export interface DaySchedule {
  timeRanges: TimeRange[];
  isClosed: boolean;
}

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** `locations.regular_service_hours`: one schedule per weekday. */
export type ServiceHours = Record<Weekday, DaySchedule>;

export interface MealTime {
  name: string;
  start_time: Hhmm;
  end_time: Hhmm;
}

/** Converts HHMM to minutes since midnight (1430 -> 870). */
export const toMinutes = (time: Hhmm): number => Math.floor(time / 100) * 60 + (time % 100);

/** Formats HHMM for people: 1430 -> "2:30 PM", 0 -> "12:00 AM". */
export const formatHhmm = (time: Hhmm): string => {
  const hours = Math.floor(time / 100);
  const minutes = time % 100;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * The open time ranges for a day, or null when the day is closed or has no ranges.
 * Accepts partial data because older rows can be missing days or fields.
 */
export const getOpenRanges = (
  hours: Partial<Record<Weekday, Partial<DaySchedule>>> | null | undefined,
  day: Weekday,
): TimeRange[] | null => {
  const schedule = hours?.[day];
  if (!schedule || schedule.isClosed || !Array.isArray(schedule.timeRanges)) return null;
  return schedule.timeRanges.length > 0 ? schedule.timeRanges : null;
};

/** Whether `time` falls inside one of the ranges. A range is open from `open` up to, not including, `close`. */
export const isWithinRanges = (ranges: TimeRange[] | null, time: Hhmm): boolean => {
  if (!ranges) return false;
  const now = toMinutes(time);
  return ranges.some((range) => now >= toMinutes(range.open) && now < toMinutes(range.close));
};

export const isOpenAt = (
  hours: Parameters<typeof getOpenRanges>[0],
  day: Weekday,
  time: Hhmm,
): boolean => isWithinRanges(getOpenRanges(hours, day), time);

export interface NextOpening {
  day: Weekday;
  /** 0 for later today, 1 for tomorrow, up to 6. */
  daysFromNow: number;
  open: Hhmm;
}

/** The next time the location opens after `time` on `day`, looking up to a week ahead. */
export const getNextOpening = (
  hours: Parameters<typeof getOpenRanges>[0],
  day: Weekday,
  time: Hhmm,
): NextOpening | null => {
  const later = getOpenRanges(hours, day)
    ?.filter((range) => toMinutes(range.open) > toMinutes(time))
    .sort((a, b) => a.open - b.open)[0];
  if (later) return { day, daysFromNow: 0, open: later.open };

  const start = WEEKDAYS.indexOf(day);
  for (let offset = 1; offset <= 6; offset++) {
    const next = WEEKDAYS[(start + offset) % 7];
    const ranges = getOpenRanges(hours, next);
    if (ranges) return { day: next, daysFromNow: offset, open: ranges[0].open };
  }
  return null;
};
