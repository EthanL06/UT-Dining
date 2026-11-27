import { toCentralTime } from '@ut-dining/core';
import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';

export function formatDateForDisplay(dateKey: string, today = getTodayInCentralTime()): string {
  const day = createDateFromString(dateKey);
  const offset = differenceInCalendarDays(day, createDateFromString(today));
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  if (offset === 1) return 'Tomorrow';
  return format(day, 'MMM d');
}

export function formatDay(day: Date, pattern: string): string {
  return format(day, pattern);
}

export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getTodayInCentralTime(): string {
  return toCentralTime().date;
}

export function addDaysToDate(date: Date, days: number): Date {
  return startOfDay(addDays(date, days));
}

export function createDateFromString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return startOfDay(date);
}
