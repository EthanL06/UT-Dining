import { type DaySchedule, type ServiceHours, WEEKDAYS, type Weekday } from '@ut-dining/core';
import { type HoursPeriod, normalizeName, periodFor, type WeekRanges } from './uhd-hours.ts';

export interface ScheduleInput {
  current: Partial<ServiceHours> | null;
  today: string;
  periods: HoursPeriod[];
  hoursRow?: string;
  truckWeek?: WeekRanges;
}

export interface DaySource {
  date: string;
  day: Weekday;
  from: string | null;
}

export interface ScheduleResult {
  hours: ServiceHours;
  days: DaySource[];
}

const CLOSED: DaySchedule = { timeRanges: [], isClosed: true };

const BREAK_PERIOD = /\bbreak\b/i;

export const weekAhead = (today: string): { date: string; day: Weekday }[] => {
  const [year, month, day] = today.split('-').map(Number);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    return { date: date.toISOString().slice(0, 10), day: WEEKDAYS[date.getUTCDay()] };
  });
};

const toDay = (ranges: { open: number; close: number }[]): DaySchedule =>
  ranges.length > 0
    ? { timeRanges: ranges.map(({ open, close }) => ({ open, close })), isClosed: false }
    : CLOSED;

export const buildSchedule = ({
  current,
  today,
  periods,
  hoursRow,
  truckWeek,
}: ScheduleInput): ScheduleResult => {
  const hours = {} as ServiceHours;
  const days: DaySource[] = [];
  for (const { date, day } of weekAhead(today)) {
    const rowPeriod = hoursRow ? periodFor(periods, date, hoursRow) : null;
    const rowWeek = rowPeriod && hoursRow ? rowPeriod.rows.get(normalizeName(hoursRow)) : null;
    if (rowPeriod && rowWeek) {
      hours[day] = toDay(rowWeek[day]);
      days.push({ date, day, from: rowPeriod.title });
      continue;
    }
    if (truckWeek) {
      const period = periodFor(periods, date);
      if (period && BREAK_PERIOD.test(period.title)) {
        hours[day] = CLOSED;
        days.push({ date, day, from: `${period.title} (food trucks close for breaks)` });
      } else {
        hours[day] = toDay(truckWeek[day]);
        days.push({ date, day, from: 'Food truck weekly hours' });
      }
      continue;
    }
    hours[day] = current?.[day] ?? CLOSED;
    days.push({ date, day, from: null });
  }
  return { hours, days };
};

const dayKey = (schedule: Partial<DaySchedule> | undefined) => {
  if (!schedule || schedule.isClosed || !schedule.timeRanges?.length) return 'closed';
  return schedule.timeRanges.map(({ open, close }) => `${open}-${close}`).join(',');
};

export const changedDays = (before: Partial<ServiceHours> | null, after: ServiceHours): Weekday[] =>
  WEEKDAYS.filter((day) => dayKey(before?.[day]) !== dayKey(after[day]));

export const formatDay = (schedule: Partial<DaySchedule> | undefined) => {
  if (dayKey(schedule) === 'closed') return 'closed';
  return (schedule?.timeRanges ?? [])
    .map(({ open, close }) => `${String(open).padStart(4, '0')}-${String(close).padStart(4, '0')}`)
    .join(', ');
};
