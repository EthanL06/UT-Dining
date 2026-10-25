import { isOpenAt, type MealTime, type ServiceHours, toCentralTime } from '@ut-dining/core';
import type { Location, LocationType } from '@/types/location';

/**
 * Check if a location is currently open based on service hours (in Central Time)
 */
export const isLocationOpen = (
  serviceHours: ServiceHours,
  forceClose?: boolean,
  hasMenus?: boolean,
): boolean => {
  // If force_close is true, always return false (closed)
  if (forceClose) {
    return false;
  }

  // If hasMenus is explicitly false, location is closed (no menus available)
  if (hasMenus === false) {
    return false;
  }

  const { day, time } = toCentralTime();
  return isOpenAt(serviceHours, day, time);
};

/**
 * Get the current meal time being served (if any) based on Central Time
 */
export const getCurrentMealTime = (location: Location, hasMenus?: boolean): string | null => {
  // If force_close is true, return null (no meal served)
  if (location.force_close) {
    return null;
  }

  // First check if location is open
  if (!isLocationOpen(location.regular_service_hours, location.force_close, hasMenus)) {
    return null;
  }

  // If no meal times defined, return null
  if (!location.meal_times || location.meal_times.length === 0) {
    return null;
  }

  const currentTime = toCentralTime().time;

  // Find the meal time that encompasses the current time
  const currentMeal = location.meal_times.find(
    (meal) => currentTime >= meal.start_time && currentTime <= meal.end_time,
  );

  // If we found an active meal time, return it
  if (currentMeal) {
    return currentMeal.name;
  }

  // If no active meal time but location is open, find the closest meal time
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

/**
 * Get location status as "Open" or "Closed" based on Central Time
 */
export const getLocationStatus = (
  serviceHours: ServiceHours,
  forceClose?: boolean,
  hasMenus?: boolean,
): 'open' | 'closed' => {
  return isLocationOpen(serviceHours, forceClose, hasMenus) ? 'open' : 'closed';
};

/**
 * Get location type name by ID
 */
export const getLocationTypeName = (typeId: string, locationTypes: LocationType[]): string => {
  const locationType = locationTypes.find((type) => type.id === typeId);
  return locationType?.name || 'Unknown';
};
