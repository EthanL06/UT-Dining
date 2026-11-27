import {
  getOpenRanges,
  isOpenAt,
  type MealTime,
  type ServiceHours,
  toMinutes,
  WEEKDAYS,
} from '@ut-dining/core';

export interface CheckedLocation {
  id: string;
  name: string | null;
  has_menus: boolean | null;
  force_close: boolean;
  regular_service_hours: unknown;
  meal_times: unknown[];
}

export const isOpenNow = (location: CheckedLocation, day: string, time: number) =>
  !location.force_close &&
  isOpenAt(location.regular_service_hours as ServiceHours, day as (typeof WEEKDAYS)[number], time);

export const getHourProblems = (location: CheckedLocation): string[] => {
  const hours = location.regular_service_hours as ServiceHours | null;
  const problems: string[] = [];

  const openDays = WEEKDAYS.filter((day) => getOpenRanges(hours, day) !== null);
  if (openDays.length === 0) problems.push('No open hours on any day');

  for (const day of WEEKDAYS) {
    const ranges = getOpenRanges(hours, day) ?? [];
    for (const range of ranges) {
      if (toMinutes(range.close) <= toMinutes(range.open)) {
        problems.push(`Closes before it opens on ${day[0].toUpperCase()}${day.slice(1)}`);
      }
    }
  }

  if (location.has_menus && (location.meal_times as MealTime[] | null)?.length === 0) {
    problems.push('Has menus but no meal times');
  }

  return problems;
};
