import { toCentralTime } from '@ut-dining/core';
import { centralInstant, shiftDateKey } from '~/utils/date';

export type QaClockRequest = { kind: 'none' } | { kind: 'off' } | { kind: 'set'; at: number };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  return { kind: 'set', at: centralInstant(shiftDateKey(today, days), params.clock).getTime() };
};
