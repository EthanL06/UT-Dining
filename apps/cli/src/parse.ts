import {
  formatHhmm,
  type Hhmm,
  type MealTime,
  PAYMENT_METHODS,
  type ServiceHours,
  type TimeRange,
  WEEKDAYS,
  type Weekday,
} from '@ut-dining/core';
import { CliError } from './output.ts';

export const CHANGELOG_ICONS = [
  'sparkles',
  'zap',
  'rocket',
  'arrow-up-down',
  'refresh-cw',
  'shield-check',
  'wrench',
  'layout',
  'moon',
  'palette',
  'utensils',
  'calendar',
  'map',
  'map-pin',
  'bell',
  'wifi-off',
] as const;

export type ChangelogIcon = (typeof CHANGELOG_ICONS)[number];

export interface ChangelogChange {
  icon: ChangelogIcon;
  title: string;
  description?: string;
}

export const isValidVersion = (version: string) => /^\d+\.\d+\.\d+$/.test(version);

export const compareVersions = (a: string, b: string) => {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const parseVersion = (value: string | undefined): string => {
  const version = value?.trim() ?? '';
  if (!isValidVersion(version))
    throw new CliError(`Version must look like 2.0.0, got "${value ?? ''}".`);
  return version;
};

export const parseTime = (value: string): Hhmm => {
  const text = value.trim().toLowerCase().replace(/\s+/g, '');
  const match = text.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!match) throw new CliError(`Can't read the time "${value}". Use 07:00, 1430 or 2:30pm.`);
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const period = match[3];
  if (period) {
    if (hours < 1 || hours > 12) throw new CliError(`Hour out of range in "${value}".`);
    hours = (hours % 12) + (period === 'pm' ? 12 : 0);
  }
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) {
    throw new CliError(`Time out of range: "${value}".`);
  }
  return hours * 100 + minutes;
};

export const parseRange = (value: string): TimeRange => {
  const parts = value.split('-');
  if (parts.length !== 2) throw new CliError(`A range looks like 07:00-14:00, got "${value}".`);
  const open = parseTime(parts[0]);
  const close = parseTime(parts[1]);
  if (close <= open) throw new CliError(`The range "${value}" closes before it opens.`);
  return { open, close };
};

export const parseRanges = (value: string): TimeRange[] => {
  const ranges = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseRange)
    .sort((a, b) => a.open - b.open);
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].open < ranges[i - 1].close)
      throw new CliError(`The ranges in "${value}" overlap.`);
  }
  if (ranges.length === 0) throw new CliError('Give at least one range, or use --closed.');
  return ranges;
};

const DAY_GROUPS: Record<string, Weekday[]> = {
  all: [...WEEKDAYS],
  everyday: [...WEEKDAYS],
  weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  weekends: ['saturday', 'sunday'],
};

export const parseDays = (value: string): Weekday[] => {
  const days = new Set<Weekday>();
  for (const raw of value.toLowerCase().split(',')) {
    const part = raw.trim();
    if (!part) continue;
    if (DAY_GROUPS[part]) {
      for (const day of DAY_GROUPS[part]) days.add(day);
      continue;
    }
    const day = WEEKDAYS.find((weekday) => weekday === part || weekday.slice(0, 3) === part);
    if (!day) {
      throw new CliError(
        `Unknown day "${part}". Use monday..sunday, mon..sun, weekdays, weekends or all.`,
      );
    }
    days.add(day);
  }
  if (days.size === 0) throw new CliError('Give at least one day.');
  return WEEKDAYS.filter((day) => days.has(day));
};

export const emptyHours = (): ServiceHours =>
  Object.fromEntries(
    WEEKDAYS.map((day) => [day, { timeRanges: [], isClosed: true }]),
  ) as unknown as ServiceHours;

export const applyHours = (
  hours: Partial<ServiceHours> | null | undefined,
  days: Weekday[],
  ranges: TimeRange[] | null,
): ServiceHours => {
  const next = { ...emptyHours(), ...(hours ?? {}) } as ServiceHours;
  for (const day of days) {
    next[day] = ranges
      ? { timeRanges: ranges, isClosed: false }
      : { timeRanges: [], isClosed: true };
  }
  return next;
};

export const formatRanges = (ranges: TimeRange[]) =>
  ranges.map((range) => `${formatHhmm(range.open)} - ${formatHhmm(range.close)}`).join(', ');

export const formatHours = (hours: Partial<ServiceHours> | null | undefined) =>
  WEEKDAYS.map((day) => {
    const schedule = hours?.[day];
    const ranges = schedule && !schedule.isClosed ? (schedule.timeRanges ?? []) : [];
    return { day, hours: ranges.length > 0 ? formatRanges(ranges) : 'Closed' };
  });

export const parseMealTime = (value: string): MealTime => {
  const index = value.lastIndexOf('=');
  if (index <= 0) throw new CliError(`A meal looks like "Breakfast=07:00-10:30", got "${value}".`);
  const range = parseRange(value.slice(index + 1));
  return { name: value.slice(0, index).trim(), start_time: range.open, end_time: range.close };
};

export const parseChange = (value: string): ChangelogChange => {
  const [first, ...rest] = value.split('|').map((part) => part.trim());
  let icon: ChangelogIcon = 'sparkles';
  let parts = [first, ...rest];
  if ((CHANGELOG_ICONS as readonly string[]).includes(first) && rest.length > 0) {
    icon = first as ChangelogIcon;
    parts = rest;
  }
  const [title, ...description] = parts;
  if (!title) throw new CliError(`A change looks like "icon|Title|Description", got "${value}".`);
  const text = description.join('|').trim();
  return text ? { icon, title, description: text } : { icon, title };
};

export const normalizeChanges = (value: unknown): ChangelogChange[] => {
  if (!Array.isArray(value)) throw new CliError('"changes" must be a list.');
  return value.map((change, index) => {
    if (
      !change ||
      typeof change !== 'object' ||
      typeof change.title !== 'string' ||
      !change.title.trim()
    ) {
      throw new CliError(`Change ${index + 1} needs a "title".`);
    }
    const icon = change.icon ?? 'sparkles';
    if (!(CHANGELOG_ICONS as readonly string[]).includes(icon)) {
      throw new CliError(`Unknown icon "${icon}". Icons: ${CHANGELOG_ICONS.join(', ')}.`);
    }
    const description = typeof change.description === 'string' ? change.description.trim() : '';
    return description
      ? { icon, title: change.title.trim(), description }
      : { icon, title: change.title.trim() };
  });
};

export const parseValue = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

export const parseAssignments = (values: string[]): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  for (const value of values) {
    const index = value.indexOf('=');
    if (index <= 0) throw new CliError(`--set takes field=value, got "${value}".`);
    patch[value.slice(0, index).trim()] = parseValue(value.slice(index + 1));
  }
  return patch;
};

export const parseDate = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new CliError(`Dates look like 2026-12-01, got "${value}".`);
  }
  return value;
};

export const parsePosition = (value: string | undefined, length: number): number => {
  const position = Number(value);
  if (!Number.isInteger(position) || position < 1 || position > length) {
    throw new CliError(`--to must be a position from 1 to ${length}.`);
  }
  return position - 1;
};

export const moveItem = <T>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const checkPaymentMethods = (methods: unknown) => {
  if (!Array.isArray(methods)) throw new CliError('methods_of_payment must be a list.');
  for (const method of methods) {
    if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
      throw new CliError(`Unknown payment method "${method}". Use: ${PAYMENT_METHODS.join(', ')}.`);
    }
  }
};
