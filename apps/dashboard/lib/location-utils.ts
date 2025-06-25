import type {
  Location,
  LocationType,
  ServiceHours,
  MealTime,
} from "@/types/location";

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/**
 * Get the current day of the week as a ServiceHours key (in Central Time)
 */
const getCurrentDay = (): keyof ServiceHours => {
  // Get current time in Central Time Zone
  const now = new Date();
  const centralTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" }),
  );
  const today = centralTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayNames: (keyof ServiceHours)[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return dayNames[today];
};

/**
 * Get current time in military format (HHMM) in Central Time Zone
 */
const getCurrentMilitaryTime = (): number => {
  // Get current time in Central Time Zone
  const now = new Date();
  const centralTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" }),
  );
  const hours = centralTime.getHours();
  const minutes = centralTime.getMinutes();
  return hours * 100 + minutes;
};

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
    console.log(`🚫 Location force closed`);
    return false;
  }

  // If hasMenus is explicitly false, location is closed (no menus available)
  if (hasMenus === false) {
    return false;
  }

  const currentDay = getCurrentDay();
  const currentTime = getCurrentMilitaryTime();
  const daySchedule = serviceHours[currentDay];

  console.log(
    `🕐 Checking location status for ${currentDay} at ${currentTime} CST`,
  );

  // If the day is marked as closed, return false
  if (daySchedule.isClosed) {
    return false;
  }

  // Check if current time falls within any of the time ranges
  return daySchedule.timeRanges.some(
    (range) => currentTime >= range.open && currentTime <= range.close,
  );
};

/**
 * Get the current meal time being served (if any) based on Central Time
 */
export const getCurrentMealTime = (
  location: Location,
  hasMenus?: boolean,
): string | null => {
  // If force_close is true, return null (no meal served)
  if (location.force_close) {
    return null;
  }

  // First check if location is open
  if (
    !isLocationOpen(
      location.regular_service_hours,
      location.force_close,
      hasMenus,
    )
  ) {
    return null;
  }

  // If no meal times defined, return null
  if (!location.meal_times || location.meal_times.length === 0) {
    return null;
  }

  const currentTime = getCurrentMilitaryTime();

  console.log(
    `🍽️ Checking meal times for ${currentTime} CST`,
    location.meal_times,
  );

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
    // Calculate time difference to meal start time
    const diffToStart = Math.abs(currentTime - meal.start_time);
    // Calculate time difference to meal end time
    const diffToEnd = Math.abs(currentTime - meal.end_time);
    // Use the smaller difference
    const minDiff = Math.min(diffToStart, diffToEnd);

    if (minDiff < smallestTimeDiff) {
      smallestTimeDiff = minDiff;
      closestMeal = meal;
    }
  }

  console.log(
    `🎯 Closest meal time found: ${closestMeal?.name || "none"} (${smallestTimeDiff} minutes away)`,
  );

  return closestMeal?.name || null;
};

/**
 * Get location status as "Open" or "Closed" based on Central Time
 */
export const getLocationStatus = (
  serviceHours: ServiceHours,
  forceClose?: boolean,
  hasMenus?: boolean,
): "open" | "closed" => {
  return isLocationOpen(serviceHours, forceClose, hasMenus) ? "open" : "closed";
};

/**
 * Get location type name by ID
 */
export const getLocationTypeName = (
  typeId: string,
  locationTypes: LocationType[],
): string => {
  const locationType = locationTypes.find((type) => type.id === typeId);
  return locationType?.name || "Unknown";
};

/**
 * Format military time to readable format (e.g., 1430 -> "2:30 PM")
 */
export const formatMilitaryTime = (militaryTime: number): string => {
  const hours = Math.floor(militaryTime / 100);
  const minutes = militaryTime % 100;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

/**
 * Get next opening time for a closed location (in Central Time)
 */
export const getNextOpeningTime = (
  serviceHours: ServiceHours,
): string | null => {
  const currentDay = getCurrentDay();
  const currentTime = getCurrentMilitaryTime();
  const currentDayIndex = daysOfWeek.indexOf(currentDay);

  // Check remaining time ranges for today
  const todaySchedule = serviceHours[currentDay];
  if (!todaySchedule.isClosed) {
    const nextRange = todaySchedule.timeRanges.find(
      (range) => range.open > currentTime,
    );
    if (nextRange) {
      return `Today at ${formatMilitaryTime(nextRange.open)} CST`;
    }
  }

  // Check next 6 days
  for (let i = 1; i <= 6; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDay = daysOfWeek[nextDayIndex];
    const nextDaySchedule = serviceHours[nextDay];

    if (!nextDaySchedule.isClosed && nextDaySchedule.timeRanges.length > 0) {
      const dayName = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
      const openTime = formatMilitaryTime(nextDaySchedule.timeRanges[0].open);
      return `${dayName} at ${openTime} CST`;
    }
  }

  return null; // No opening time found in the next week
};
