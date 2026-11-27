import { eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { useDatabase } from '~/hooks/useDatabase';
import * as schema from '~/services/database/schema';
import { log } from '~/utils/log';

export interface MealTimes {
  breakfast?: { openTime: number; closeTime: number };
  lunch?: { openTime: number; closeTime: number };
  dinner?: { openTime: number; closeTime: number };
}

export const getLocationName = (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
  useColloquial: boolean,
): string => {
  if (!useColloquial) return locationName;

  try {
    const locationData = db
      .select({
        name: schema.location.name,
        colloquial_name: schema.location.colloquial_name,
      })
      .from(schema.location)
      .where(eq(schema.location.name, locationName))
      .get();

    if (locationData?.colloquial_name) {
      return locationData.colloquial_name;
    }

    return locationName;
  } catch (error) {
    log.error('Error fetching location name from database', error);
    return locationName;
  }
};

export const getMealTimes = (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
): MealTimes | null => {
  try {
    const locationData = db
      .select({
        meal_times: schema.location.meal_times,
      })
      .from(schema.location)
      .where(eq(schema.location.name, locationName))
      .get();

    if (locationData?.meal_times) {
      const mealTimesArray = locationData.meal_times as {
        name: string;
        start_time: number;
        end_time: number;
      }[];

      const mealTimes: MealTimes = {};

      mealTimesArray.forEach((meal) => {
        const mealName = meal.name.toLowerCase() as 'breakfast' | 'lunch' | 'dinner';
        mealTimes[mealName] = {
          openTime: meal.start_time,
          closeTime: meal.end_time,
        };
      });

      return mealTimes;
    }

    return null;
  } catch (error) {
    log.error('Error fetching meal times from database', error);
    return null;
  }
};

export const useLocationName = (locationName: string, useColloquial: boolean): string => {
  const db = useDatabase();
  return getLocationName(db, locationName, useColloquial);
};

export const useMealTimes = (locationName: string): MealTimes | null => {
  const db = useDatabase();
  return getMealTimes(db, locationName);
};
