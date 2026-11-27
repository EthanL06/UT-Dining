import type { Location, MealTime, TimeRange } from '@/types/location';

export const daysOfWeek = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const mealTimeOptions = [
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Lunch', label: 'Lunch' },
  { value: 'Dinner', label: 'Dinner' },
];

export function validateServiceHours(value: { timeRanges: TimeRange[]; isClosed: boolean }) {
  if (value.isClosed) {
    return null;
  }

  if (!value.timeRanges || value.timeRanges.length === 0) {
    return 'At least one time range is required when day is open';
  }

  for (let i = 0; i < value.timeRanges.length; i++) {
    const range = value.timeRanges[i];

    if (range.open === undefined || range.close === undefined) {
      return `Time range ${i + 1}: Both open and close times are required`;
    }

    if (range.close <= range.open) {
      return `Time range ${i + 1}: Close time must be after open time`;
    }
  }

  const sortedRanges = [...value.timeRanges].sort((a, b) => a.open - b.open);
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const current = sortedRanges[i];
    const next = sortedRanges[i + 1];

    if (current.close > next.open) {
      return 'Time ranges cannot overlap';
    }

    if (current.close === next.open) {
      return 'Time ranges must have at least a 15-minute gap between them';
    }
  }

  return null;
}

export function militaryToTimeInput(militaryTime: number): string {
  const hours = Math.floor(militaryTime / 100);
  const minutes = militaryTime % 100;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function timeInputToMilitary(timeInput: string): number {
  const [hours, minutes] = timeInput.split(':').map(Number);
  return hours * 100 + minutes;
}

export function validateServiceHoursRequired(
  serviceHours: Location['regular_service_hours'],
): string | null {
  const allDaysClosed = daysOfWeek.every((day) => serviceHours[day].isClosed);
  if (allDaysClosed) {
    return 'At least one day must have service hours';
  }
  return null;
}

export function validatePaymentMethodsRequired(paymentMethods: string[]): string | null {
  if (paymentMethods.length === 0) {
    return 'At least one payment method is required';
  }
  return null;
}

export function validateMealTimes(mealTimes: MealTime[]): string | null {
  for (let i = 0; i < mealTimes.length; i++) {
    const mealTime = mealTimes[i];
    if (!mealTime.name || mealTime.name.trim() === '') {
      return `Meal time ${i + 1}: Meal name is required`;
    }
    if (mealTime.end_time <= mealTime.start_time) {
      return `Meal time ${i + 1}: End time must be after start time`;
    }
  }

  const sortedMealTimes = [...mealTimes].sort((a, b) => a.start_time - b.start_time);
  for (let i = 0; i < sortedMealTimes.length - 1; i++) {
    const current = sortedMealTimes[i];
    const next = sortedMealTimes[i + 1];

    if (current.end_time > next.start_time) {
      return `Meal times cannot overlap: ${current.name} and ${next.name} have overlapping times`;
    }
  }

  return null;
}

export function toLocationFormValues(localEditingLocation: Location | null): Location {
  if (localEditingLocation) {
    return {
      ...localEditingLocation,
      colloquial_name: localEditingLocation.colloquial_name || '',
      image: localEditingLocation.image || '',
      apple_maps_link: localEditingLocation.apple_maps_link || '',
      google_maps_link: localEditingLocation.google_maps_link || '',
      meal_times: localEditingLocation.meal_times || [],
      has_menus: localEditingLocation.has_menus ?? false,
    };
  }

  return {
    name: '',
    colloquial_name: '',
    description: '',
    address: '',
    image: '',
    apple_maps_link: '',
    google_maps_link: '',
    latitude: 0,
    longitude: 0,
    regular_service_hours: {
      monday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
      tuesday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
      wednesday: {
        timeRanges: [{ open: 700, close: 1000 }],
        isClosed: false,
      },
      thursday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
      friday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
      saturday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
      sunday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: false },
    },
    meal_times: [],
    methods_of_payment: [],
    status: 'open',
    type_id: '',
    force_close: false,
    has_menus: false,
    updated_at: new Date().toISOString(),
  } as Location;
}

export function nextTimeRange(currentRanges: TimeRange[]): TimeRange {
  const lastRange = currentRanges.at(-1);
  if (!lastRange) return { open: 700, close: 1000 };
  const open = lastRange.close + 100;
  return { open, close: Math.min(open + 100, 2359) };
}

export function copyTooltipLabel(dayIndex: number, copiedDay: string | null): string {
  if (copiedDay === daysOfWeek[dayIndex]) return 'Copied!';
  const nextDay = daysOfWeek[dayIndex + 1];
  return `Copy times to ${nextDay?.charAt(0).toUpperCase()}${nextDay?.slice(1)}`;
}

export interface LocationFormSnapshot {
  formValues: Location;
  paymentMethods: string[];
  mealTimes: MealTime[];
}

export function hasLocationFormChanges(
  initial: LocationFormSnapshot | null,
  current: LocationFormSnapshot,
): boolean {
  if (!initial) return false;
  return (
    JSON.stringify(current.formValues) !== JSON.stringify(initial.formValues) ||
    JSON.stringify(current.paymentMethods) !== JSON.stringify(initial.paymentMethods) ||
    JSON.stringify(current.mealTimes) !== JSON.stringify(initial.mealTimes)
  );
}
