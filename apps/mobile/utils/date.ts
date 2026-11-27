import { toCentralTime } from '@ut-dining/core';
import { addDays, format, isSameDay, isToday, startOfDay, subDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export function formatDateForDisplay(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }

  const yesterday = subDays(new Date(), 1);
  const tomorrow = addDays(new Date(), 1);

  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  if (isSameDay(date, tomorrow)) {
    return 'Tomorrow';
  }

  return format(date, 'MMM d');
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
