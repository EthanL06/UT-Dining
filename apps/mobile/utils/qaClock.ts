import { miscStorage } from '~/store/misc-storage';
import { isDevVariant } from '~/utils/appVariant';

const OFFSET_KEY = 'qa-clock-offset-ms';
const RealDate = Date;
let offsetMs = 0;

const shiftedNow = () => RealDate.now() + offsetMs;

function QaDate(this: unknown, ...args: unknown[]) {
  if (!new.target) return new RealDate(shiftedNow()).toString();
  return Reflect.construct(RealDate, args.length === 0 ? [shiftedNow()] : args, RealDate);
}
QaDate.prototype = RealDate.prototype;
QaDate.now = shiftedNow;
QaDate.parse = RealDate.parse;
QaDate.UTC = RealDate.UTC;

const apply = (next: number) => {
  offsetMs = next;
  globalThis.Date = (next === 0 ? RealDate : QaDate) as DateConstructor;
};

export const realNow = () => RealDate.now();

export const setQaClock = (at: number | null) => {
  if (!isDevVariant) return;
  const next = at === null ? 0 : at - RealDate.now();
  if (next === 0) miscStorage.remove(OFFSET_KEY);
  else miscStorage.set(OFFSET_KEY, next);
  apply(next);
};

if (isDevVariant) {
  const stored = miscStorage.getNumber(OFFSET_KEY);
  if (stored !== undefined && stored !== 0) apply(stored);
}
