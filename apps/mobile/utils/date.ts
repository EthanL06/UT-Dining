import { toCentralTime } from '@ut-dining/core';
import { addDays, differenceInCalendarDays, format, isToday, startOfDay, subDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

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

export function getCentralTimeDate(): Date {
  const centralTimeZone = 'America/Chicago';
  return toZonedTime(new Date(), centralTimeZone);
}

export function getTodayInCentralTime(): string {
  return toCentralTime().date;
}

export function formatInCentralTime(date: Date, formatString: string): string {
  const centralTimeZone = 'America/Chicago';
  return formatInTimeZone(date, centralTimeZone, formatString);
}

export function convertToCentralTime(date: Date): Date {
  const centralTimeZone = 'America/Chicago';
  return toZonedTime(date, centralTimeZone);
}

export function convertFromCentralTime(centralDate: Date): Date {
  const centralTimeZone = 'America/Chicago';
  return toZonedTime(centralDate, centralTimeZone);
}

export function addDaysToDate(date: Date, days: number): Date {
  return startOfDay(addDays(date, days));
}

export function subtractDaysFromDate(date: Date, days: number): Date {
  return startOfDay(subDays(date, days));
}

export function parseDateString(dateString: string): Date {
  return new Date(dateString);
}

export function isDateToday(date: Date): boolean {
  return isToday(date);
}

export function createDateFromString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return startOfDay(date);
}
