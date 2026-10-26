import type { Json } from '@ut-dining/supabase';
import pLimit from 'p-limit';
import { createSupabase } from './supabase.ts';
import type { LocationDay } from './types.ts';

const UPLOAD_CONCURRENCY = 2;

export const upload = async (days: LocationDay[]) => {
  const supabase = createSupabase();
  const limit = pLimit(UPLOAD_CONCURRENCY);

  return Promise.all(
    days
      .filter((day) => day.menus.length > 0)
      .map((day) =>
        limit(async () => {
          const { error } = await supabase.rpc('insert_multiple_locations_and_menus', {
            arg_data_array: [day] as unknown as Json[],
          });
          return { locationName: day.locationName, date: day.date, error: error?.message };
        }),
      ),
  );
};
