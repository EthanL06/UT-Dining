import type { Json } from '@ut-dining/supabase';
import { createSupabase } from './supabase.ts';
import type { LocationDay } from './types.ts';

export const upload = async (days: LocationDay[]) => {
  const supabase = createSupabase();
  const byLocation = new Map<string, LocationDay[]>();
  for (const day of days) {
    if (day.menus.length === 0) continue;
    byLocation.set(day.locationName, [...(byLocation.get(day.locationName) ?? []), day]);
  }

  const results = await Promise.all(
    [...byLocation].map(async ([locationName, locationDays]) => {
      const { error } = await supabase.rpc('insert_multiple_locations_and_menus', {
        arg_data_array: locationDays as unknown as Json[],
      });
      return { locationName, error: error?.message };
    }),
  );

  return results;
};
