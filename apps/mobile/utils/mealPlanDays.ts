import { addDaysToDate, createDateFromString, formatDateForAPI } from '~/utils/date';

export const PLAN_RANGE_STEP = 21;

export const planStripDates = (
  today: string,
  range: { before: number; after: number },
  include: readonly string[],
) => {
  const todayDate = createDateFromString(today);
  const fromRange = formatDateForAPI(addDaysToDate(todayDate, -range.before));
  const toRange = formatDateForAPI(addDaysToDate(todayDate, range.after));
  const first = [fromRange, ...include].sort()[0];
  const last = [toRange, ...include].sort().at(-1) ?? toRange;
  const dates: string[] = [];
  for (
    let day = createDateFromString(first);
    formatDateForAPI(day) <= last;
    day = addDaysToDate(day, 1)
  ) {
    dates.push(formatDateForAPI(day));
  }
  return dates;
};
