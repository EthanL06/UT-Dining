import { toCentralTime } from '@ut-dining/core';

export type QaClockRequest = { kind: 'none' } | { kind: 'off' } | { kind: 'set'; at: number };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const wallMinutes = (dateKey: string, hhmm: number) =>
  Date.parse(`${dateKey}T00:00:00Z`) / MINUTE_MS + Math.floor(hhmm / 100) * 60 + (hhmm % 100);

export const centralInstant = (dateKey: string, hhmm: string): number => {
  const wanted = wallMinutes(dateKey, Number(hhmm.replace(':', '')));
  let guess = wanted * MINUTE_MS;
  for (let step = 0; step < 2; step += 1) {
    const seen = toCentralTime(new Date(guess));
    guess += (wanted - wallMinutes(seen.date, seen.time)) * MINUTE_MS;
  }
  return guess;
};

export const shiftDateKey = (dateKey: string, days: number): string =>
  new Date(Date.parse(`${dateKey}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export const parseQaClock = (
  params: { clock?: string; days?: string },
  realNow: number,
): QaClockRequest => {
  if (params.clock === undefined) return { kind: 'none' };
  if (params.clock === 'off') return { kind: 'off' };
  if (!TIME.test(params.clock)) return { kind: 'none' };
  const days = Number(params.days ?? 0);
  if (!Number.isInteger(days)) return { kind: 'none' };
  const today = toCentralTime(new Date(realNow)).date;
  return { kind: 'set', at: centralInstant(shiftDateKey(today, days), params.clock) };
};
