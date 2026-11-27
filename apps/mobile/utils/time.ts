import {
  formatHhmm,
  getNextOpening,
  getOpenRanges,
  isWithinRanges,
  type MealTime,
  type ServiceHours,
  type TimeRange,
  toCentralTime,
  toMinutes,
  type Weekday,
} from '@ut-dining/core';

import type * as schema from '~/services/database/schema';

import type { MealTimes } from '~/utils/locations';

type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const weekdayName = (date: Date): WeekDay => {
  const { day } = toCentralTime(date);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}` as WeekDay;
};

export const timeOfDay = (
  date: Date,
  mealTimes?: MealTimes,
): 'morning' | 'afternoon' | 'evening' => {
  const currentTime = toCentralTime(date).time;
  const hour = Math.floor(currentTime / 100);

  if (mealTimes && (mealTimes.breakfast || mealTimes.lunch || mealTimes.dinner)) {
    const breakfastEnd = mealTimes.breakfast?.closeTime ?? 1100;
    const lunchEnd = mealTimes.lunch?.closeTime ?? 1700;

    if (currentTime < breakfastEnd) return 'morning';
    if (currentTime < lunchEnd) return 'afternoon';
    return 'evening';
  }

  if (hour < 11) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export function getTodaySchedule(locationData: schema.Location | null, date: Date = new Date()) {
  if (!locationData?.regular_service_hours) return null;

  const ranges = getOpenRanges(
    locationData.regular_service_hours as Partial<ServiceHours>,
    toCentralTime(date).day,
  );
  if (!ranges) return null;

  return {
    days: [weekdayName(date)],
    intervals: ranges.map((timeRange: TimeRange) => ({
      openTime: timeRange.open,
      closeTime: timeRange.close,
    })),
  };
}

export function isLocationOpen(
  locationData: schema.Location | null,
  currentTime: Date = new Date(),
): boolean {
  if (locationData?.force_close) {
    return false;
  }

  const ranges = getOpenRanges(
    locationData?.regular_service_hours as Partial<ServiceHours> | null,
    toCentralTime(currentTime).day,
  );
  return isWithinRanges(ranges, toCentralTime(currentTime).time);
}

export function getLocationTimeMessage(
  locationData: schema.Location | null,
  currentTime: Date = new Date(),
): string {
  const schedule = getTodaySchedule(locationData, currentTime);
  if (!schedule || schedule.intervals.length === 0) return 'Closed';

  const currentMinutes = toMinutes(toCentralTime(currentTime).time);

  for (const { openTime, closeTime } of schedule.intervals) {
    const openM = toMinutes(openTime);
    const closeM = toMinutes(closeTime);
    if (currentMinutes >= openM && currentMinutes < closeM) {
      const diffMins = closeM - currentMinutes;
      return diffMins < 60
        ? `Open for ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'}`
        : `Open for ${Math.ceil(diffMins / 60)} ${Math.ceil(diffMins / 60) > 1 ? 'hours' : 'hour'}`;
    }
  }

  const nextOpening = schedule.intervals
    .map(({ openTime }: { openTime: number }) => toMinutes(openTime))
    .filter((openM: number) => openM > currentMinutes)
    .sort((a: number, b: number) => a - b)[0];

  if (nextOpening !== undefined) {
    const diffMins = nextOpening - currentMinutes;
    return diffMins < 60
      ? `Opens in ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'}`
      : `Opens in ${Math.ceil(diffMins / 60)} ${Math.ceil(diffMins / 60) > 1 ? 'hours' : 'hour'}`;
  }

  return 'Closed';
}

export function formatTimeFromNumber(time: number): string {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

const dayAbbreviations: Record<WeekDay, string> = {
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'TH',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export function generateSchedule(
  locationData: schema.Location | null,
  _todayFirst = true,
): { dayRange: string; time: string }[] {
  if (!locationData?.regular_service_hours) return [];

  const serviceHours = locationData.regular_service_hours as Partial<ServiceHours>;
  const dayOrder: WeekDay[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const rangesFor = (weekDay: WeekDay) =>
    getOpenRanges(serviceHours, weekDay.toLowerCase() as Weekday);

  const getDayKey = (weekDay: WeekDay) => {
    const ranges = rangesFor(weekDay);
    return ranges ? JSON.stringify(ranges) : 'CLOSED';
  };

  const formatTime = (weekDay: WeekDay) => {
    const ranges = rangesFor(weekDay);
    if (ranges) {
      const intervals = ranges.map((interval: TimeRange) => {
        const openStr = formatTimeFromNumber(interval.open);
        const closeStr = formatTimeFromNumber(interval.close);
        return `${openStr} - ${closeStr}`;
      });
      const lines: string[] = [];
      for (let i = 0; i < intervals.length; i += 2) {
        lines.push(intervals.slice(i, i + 2).join(', '));
      }
      return lines.join('\n');
    }
    return 'Closed';
  };

  const result: { dayRange: string; time: string }[] = [];
  let groupStart = 0;
  let prevKey = getDayKey(dayOrder[0]);

  for (let i = 1; i <= dayOrder.length; i++) {
    const currentKey = i < dayOrder.length ? getDayKey(dayOrder[i]) : '__END__';
    if (currentKey !== prevKey) {
      const daysInGroup = dayOrder.slice(groupStart, i);
      let dayRange = '';
      if (daysInGroup.length === 1) {
        dayRange = dayAbbreviations[daysInGroup[0]];
      } else {
        dayRange = `${dayAbbreviations[daysInGroup[0]]}-${dayAbbreviations[daysInGroup[daysInGroup.length - 1]]}`;
      }
      result.push({ dayRange, time: formatTime(daysInGroup[0]) });
      groupStart = i;
      prevKey = currentKey;
    }
  }

  return result;
}

export const formatTimeSinceSync = (timeSinceSync: number): string => {
  if (timeSinceSync === Infinity) {
    return 'Never synced';
  }

  const seconds = Math.floor(timeSinceSync / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  return 'Just now';
};

export function getLocationStatusText(
  locationData: schema.Location,
  isOpen: boolean,
  currentTime: Date = new Date(),
): string {
  const { day, time } = toCentralTime(currentTime);
  const hours = locationData.regular_service_hours as Partial<ServiceHours> | null;

  if (isOpen) {
    const range = getOpenRanges(hours, day)?.find((r) => isWithinRanges([r], time));
    return range ? `Open until ${formatHhmm(range.close)}` : 'Open';
  }
  if (locationData.force_close) return 'Temporarily closed';
  if (isWithinRanges(getOpenRanges(hours, day), time)) return 'No menu today';

  const next = getNextOpening(hours, day, time);
  if (!next) return 'Closed';
  if (next.daysFromNow === 0) return `Opens at ${formatHhmm(next.open)}`;
  if (next.daysFromNow === 1) return `Opens tomorrow at ${formatHhmm(next.open)}`;
  return 'Closed today';
}

export function getCurrentMeal(
  locationData: schema.Location,
  currentTime: Date = new Date(),
): MealTime | null {
  const meals = (locationData.meal_times ?? []) as MealTime[];
  const now = toMinutes(toCentralTime(currentTime).time);
  return (
    meals.find((meal) => now >= toMinutes(meal.start_time) && now < toMinutes(meal.end_time)) ??
    null
  );
}
