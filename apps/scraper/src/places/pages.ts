import { isPaymentMethod, type PaymentMethod, WEEKDAYS, type Weekday } from '@ut-dining/core';
import { load } from 'cheerio';
import { parseRanges } from './time.ts';
import type { WeekRanges } from './uhd-hours.ts';

export const UHD_BASE = 'https://housing.utexas.edu';
export const UNIONS_BASE = 'https://universityunions.utexas.edu';
export const UHD_LISTS = ['restaurants', 'coffee-shops', 'convenience-stores'].map(
  (list) => `${UHD_BASE}/dining/dining-locations/${list}`,
);
export const UNIONS_TRUCKS_URL = `${UNIONS_BASE}/eat/food-trucks`;

export interface ListedPlace {
  name: string;
  url: string;
}

const absolute = (base: string, href: string) => new URL(href, base).toString();

export const parseUhdList = (html: string): ListedPlace[] => {
  const $ = load(html);
  const places = new Map<string, ListedPlace>();
  $('a[href*="/dining/dining-locations/"]').each((_, link) => {
    const href = $(link).attr('href') ?? '';
    if (!/\/dining\/dining-locations\/[^/]+\/[^/?#]+$/.test(href)) return;
    if (href.includes('/dining-halls/')) return;
    const name = $(link).text().replace(/\s+/g, ' ').trim();
    if (name) places.set(href, { name, url: absolute(UHD_BASE, href) });
  });
  return [...places.values()];
};

export const parseUnionsTrucks = (html: string): ListedPlace[] => {
  const $ = load(html);
  const places = new Map<string, ListedPlace>();
  $('article.uhd-dining-location h3 a[href]').each((_, link) => {
    const href = $(link).attr('href') ?? '';
    const name = $(link).text().replace(/\s+/g, ' ').trim();
    if (name) places.set(href, { name, url: absolute(UNIONS_BASE, href) });
  });
  return [...places.values()];
};

export interface PaymentResult {
  methods: PaymentMethod[];
  unknown: string[];
}

export const parsePaymentMethods = (html: string): PaymentResult | null => {
  const $ = load(html);
  const field = $('.field--name-field-uhd-dl-payment-type');
  if (field.length === 0) return null;
  const methods: PaymentMethod[] = [];
  const unknown: string[] = [];
  field.find('.field__item').each((_, item) => {
    const text = $(item).text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (isPaymentMethod(text)) {
      if (!methods.includes(text)) methods.push(text);
    } else if (!unknown.includes(text)) {
      unknown.push(text);
    }
  });
  return { methods, unknown };
};

const DAY_ALIASES: Record<string, Weekday> = {
  mon: 'monday',
  tue: 'tuesday',
  tues: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
};

const toWeekday = (raw: string): Weekday | null => {
  const word = raw.toLowerCase().replace(/[^a-z]/g, '');
  if ((WEEKDAYS as readonly string[]).includes(word)) return word as Weekday;
  return DAY_ALIASES[word] ?? null;
};

const MONDAY_FIRST: Weekday[] = [...WEEKDAYS.slice(1), WEEKDAYS[0]];

export const parseDaySpec = (raw: string): Weekday[] | null => {
  const days: Weekday[] = [];
  for (const part of raw.replace(/:\s*$/, '').split(/\s*(?:,|&|\band\b)\s*/)) {
    if (!part.trim()) continue;
    const ends = part.split(/\s*[-–—]\s*|\s+to\s+|\s+through\s+/);
    const from = toWeekday(ends[0]);
    const to = toWeekday(ends.at(-1) ?? '');
    if (!from || !to || ends.length > 2) return null;
    const start = MONDAY_FIRST.indexOf(from);
    const end = MONDAY_FIRST.indexOf(to);
    if (end < start) return null;
    days.push(...MONDAY_FIRST.slice(start, end + 1));
  }
  return days.length > 0 ? days : null;
};

export interface UnionsHours {
  heading: string;
  week: WeekRanges;
}

export const parseUnionsHours = (html: string): UnionsHours | { error: string } => {
  const $ = load(html);
  const field = $('.field--name-field-uhd-hours-paragraph').first();
  const table = field.find('table.office-hours__table, table').first();
  if (table.length === 0) return { error: 'No hours table' };
  const heading = field
    .find('h2')
    .map((_, h2) => $(h2).text().trim())
    .get()
    .find((text) => text && text !== 'Hours');
  const week = Object.fromEntries(WEEKDAYS.map((day) => [day, []])) as unknown as WeekRanges;
  const seen = new Set<Weekday>();
  let rows = 0;
  for (const tr of table.find('tbody tr').toArray()) {
    const cells = $(tr)
      .children('td')
      .map((_, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();
    if (cells.length < 2) continue;
    const days = parseDaySpec(cells[0]);
    if (!days) return { error: `Unreadable days "${cells[0]}"` };
    const ranges = parseRanges([cells[1] || cells[2] || 'Closed']);
    if (!ranges) return { error: `Unreadable hours "${cells[1]}" for ${cells[0]}` };
    rows++;
    for (const day of days) {
      week[day] = seen.has(day) ? [...week[day], ...ranges] : ranges;
      seen.add(day);
    }
  }
  if (rows === 0) return { error: 'The hours table has no rows' };
  return { heading: heading || 'Hours', week };
};
