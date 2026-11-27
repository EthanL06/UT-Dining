import type { Hhmm, TimeRange } from '@ut-dining/core';

export const END_OF_DAY: Hhmm = 2359;

const clean = (value: string) =>
  value.toLowerCase().replace(/ /g, ' ').replace(/\./g, '').replace(/\s+/g, ' ').trim();

export const parseTime = (raw: string, meridiemHint?: 'am' | 'pm'): Hhmm | null => {
  const value = clean(raw);
  if (value === 'noon') return 1200;
  if (value === 'midnight') return END_OF_DAY;
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3] ?? meridiemHint;
  if (!meridiem || hour < 1 || hour > 12 || minute > 59) return null;
  return ((hour % 12) + (meridiem === 'pm' ? 12 : 0)) * 100 + minute;
};

export const isClosedText = (raw: string) => /^closed\b/.test(clean(raw));

export const parseRange = (raw: string): TimeRange | null => {
  const parts = clean(raw).split(/\s*(?:-|–|—|\bto\b)\s*/);
  if (parts.length !== 2) return null;
  const closeMeridiem = parts[1].match(/(am|pm)$/)?.[1] as 'am' | 'pm' | undefined;
  const close = parseTime(parts[1]);
  const open = parseTime(parts[0], closeMeridiem);
  if (open === null || close === null) return null;
  if (close === 0 || close <= open) return { open, close: END_OF_DAY };
  return { open, close };
};

export const parseRanges = (texts: string[]): TimeRange[] | null => {
  const ranges: TimeRange[] = [];
  for (const text of texts) {
    if (!text.trim() || isClosedText(text)) continue;
    const range = parseRange(text);
    if (!range) return null;
    ranges.push(range);
  }
  return ranges.sort((a, b) => a.open - b.open);
};
