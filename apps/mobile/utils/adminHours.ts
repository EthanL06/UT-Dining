import { type DaySchedule, type ServiceHours, type TimeRange, WEEKDAYS } from '@ut-dining/core';

const pad = (value: number) => value.toString().padStart(2, '0');

const formatTime = (time: number) => `${pad(Math.floor(time / 100))}:${pad(time % 100)}`;

export const formatDayRanges = (day: DaySchedule | undefined): string =>
  day && !day.isClosed
    ? day.timeRanges
        .map((range) => `${formatTime(range.open)}-${formatTime(range.close)}`)
        .join(', ')
    : '';

const TIME = /^(\d{1,2}):?(\d{2})$/;

const parseTime = (text: string): number | null => {
  const match = TIME.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 100 + minutes;
};

export type ParsedDay = { kind: 'ok'; day: DaySchedule } | { kind: 'invalid' };

export const parseDayRanges = (text: string): ParsedDay => {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { kind: 'ok', day: { isClosed: true, timeRanges: [] } };
  const ranges: TimeRange[] = [];
  for (const part of parts) {
    const [openText, closeText, extra] = part.split('-');
    if (extra !== undefined || openText === undefined || closeText === undefined) {
      return { kind: 'invalid' };
    }
    const open = parseTime(openText);
    const close = parseTime(closeText);
    if (open === null || close === null || close <= open) return { kind: 'invalid' };
    ranges.push({ open, close });
  }
  ranges.sort((a, b) => a.open - b.open);
  for (let index = 1; index < ranges.length; index++) {
    if (ranges[index].open < ranges[index - 1].close) return { kind: 'invalid' };
  }
  return { kind: 'ok', day: { isClosed: false, timeRanges: ranges } };
};

export type HoursDraft = Record<(typeof WEEKDAYS)[number], string>;

export const toHoursDraft = (hours: Partial<ServiceHours> | null | undefined): HoursDraft =>
  Object.fromEntries(WEEKDAYS.map((day) => [day, formatDayRanges(hours?.[day])])) as HoursDraft;

export type ParsedHours =
  | { kind: 'ok'; hours: ServiceHours }
  | { kind: 'invalid'; days: (typeof WEEKDAYS)[number][] };

export const parseHoursDraft = (draft: HoursDraft): ParsedHours => {
  const entries = WEEKDAYS.map((day) => [day, parseDayRanges(draft[day])] as const);
  const invalid = entries.filter(([, parsed]) => parsed.kind === 'invalid').map(([day]) => day);
  if (invalid.length > 0) return { kind: 'invalid', days: invalid };
  return {
    kind: 'ok',
    hours: Object.fromEntries(
      entries.map(([day, parsed]) => [day, parsed.kind === 'ok' ? parsed.day : null]),
    ) as ServiceHours,
  };
};
