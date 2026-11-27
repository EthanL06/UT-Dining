import type { TimeRange, Weekday } from '@ut-dining/core';
import { load } from 'cheerio';
import { parseRanges } from './time.ts';

export const UHD_HOURS_URL = 'https://housing.utexas.edu/dining/hours-of-operation';

export type WeekRanges = Record<Weekday, TimeRange[]>;

export interface HoursPeriod {
  title: string;
  start: string;
  end: string;
  rows: Map<string, WeekRanges>;
}

export interface HoursPage {
  periods: HoursPeriod[];
  unreadable: string[];
}

const COLUMN_DAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const toIsoDate = (raw: string): string | null => {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
};

export const parsePeriodTitle = (summary: string) => {
  const match = summary.match(
    /^(.*?)\s*\(\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*\)/,
  );
  if (!match) return null;
  const start = toIsoDate(match[2]);
  const end = toIsoDate(match[3]);
  if (!start || !end || end < start) return null;
  return { title: match[1].trim(), start, end };
};

export const normalizeName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const parseHoursPage = (html: string): HoursPage => {
  const $ = load(html);
  const periods: HoursPeriod[] = [];
  const unreadable: string[] = [];

  $('details').each((_, details) => {
    const summary = $(details).children('summary').first().text().replace(/\s+/g, ' ').trim();
    const period = parsePeriodTitle(summary);
    if (!period) {
      if (summary) unreadable.push(`Period title "${summary}"`);
      return;
    }
    const rows = new Map<string, WeekRanges>();
    $(details)
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr).children('td');
        const name = cells.first().text().replace(/\s+/g, ' ').trim();
        if (!name) return;
        if (cells.length !== 8) {
          unreadable.push(`${period.title}: row "${name}" has ${cells.length - 1} day columns`);
          return;
        }
        const week = {} as WeekRanges;
        for (const [index, day] of COLUMN_DAYS.entries()) {
          const cell = cells.eq(index + 1);
          const divs = cell.find('div');
          const texts = divs.length > 0 ? divs.map((_, div) => $(div).text()).get() : [cell.text()];
          const ranges = parseRanges(texts);
          if (!ranges) {
            unreadable.push(`${period.title}: ${name} ${day} "${cell.text().trim()}"`);
            return;
          }
          week[day] = ranges;
        }
        rows.set(normalizeName(name), week);
      });
    periods.push({ ...period, rows });
  });

  return { periods, unreadable };
};

const spanDays = (period: HoursPeriod) =>
  (Date.parse(period.end) - Date.parse(period.start)) / 86_400_000;

export const periodFor = (
  periods: HoursPeriod[],
  date: string,
  rowName?: string,
): HoursPeriod | null => {
  const key = rowName ? normalizeName(rowName) : null;
  const covering = periods.filter(
    (period) => period.start <= date && date <= period.end && (!key || period.rows.has(key)),
  );
  covering.sort((a, b) => spanDays(a) - spanDays(b));
  return covering[0] ?? null;
};
