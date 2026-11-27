import { isOpenAt, type MealTime, type ServiceHours, toCentralTime } from '@ut-dining/core';
import type { Location, LocationType } from '@/types/location';

export const isLocationOpen = (
  serviceHours: ServiceHours,
  forceClose?: boolean,
  hasMenus?: boolean,
): boolean => {
  if (forceClose) {
    return false;
  }

  if (hasMenus === false) {
    return false;
  }

  const { day, time } = toCentralTime();
  return isOpenAt(serviceHours, day, time);
};

export const getCurrentMealTime = (location: Location, hasMenus?: boolean): string | null => {
  if (location.force_close) {
    return null;
  }

  if (!isLocationOpen(location.regular_service_hours, location.force_close, hasMenus)) {
    return null;
  }

  if (!location.meal_times || location.meal_times.length === 0) {
    return null;
  }

  const currentTime = toCentralTime().time;

  const currentMeal = location.meal_times.find(
    (meal) => currentTime >= meal.start_time && currentTime <= meal.end_time,
  );

  if (currentMeal) {
    return currentMeal.name;
  }

  let closestMeal: MealTime | null = null;
  let smallestTimeDiff = Infinity;

  for (const meal of location.meal_times) {
    const minDiff = Math.min(
      Math.abs(currentTime - meal.start_time),
      Math.abs(currentTime - meal.end_time),
    );

    if (minDiff < smallestTimeDiff) {
      smallestTimeDiff = minDiff;
      closestMeal = meal;
    }
  }

  return closestMeal?.name || null;
};

export const getLocationStatus = (
  serviceHours: ServiceHours,
  forceClose?: boolean,
  hasMenus?: boolean,
): 'open' | 'closed' => {
  return isLocationOpen(serviceHours, forceClose, hasMenus) ? 'open' : 'closed';
};

export const getLocationTypeName = (typeId: string, locationTypes: LocationType[]): string => {
  const locationType = locationTypes.find((type) => type.id === typeId);
  return locationType?.name || 'Unknown';
};
