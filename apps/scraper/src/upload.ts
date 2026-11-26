import type { Json } from '@ut-dining/supabase';
import pLimit from 'p-limit';
import { createSupabase } from './supabase.ts';
import type { LocationDay } from './types.ts';

const UPLOAD_CONCURRENCY = 2;

interface UploadResult {
  locationName: string;
  date: string;
  pruned: number;
  error?: string;
}

export const upload = async (days: LocationDay[]): Promise<UploadResult[]> => {
  const supabase = createSupabase();
  const limit = pLimit(UPLOAD_CONCURRENCY);

  return Promise.all(
    days
      .filter((day) => day.menus.length > 0)
      .map((day) =>
        limit(async () => {
          const result: UploadResult = {
            locationName: day.locationName,
            date: day.date,
            pruned: 0,
          };
          const { error } = await supabase.rpc('insert_multiple_locations_and_menus', {
            arg_data_array: [day] as unknown as Json[],
          });
          if (error) return { ...result, error: error.message };
          if (!day.complete) return result;

          const pruned = await supabase.rpc('prune_location_day_menus', {
            arg_location_name: day.locationName,
            arg_date: day.date,
            arg_menu_names: day.menus.map((menu) => menu.type),
          });
          if (pruned.error) return { ...result, error: `prune: ${pruned.error.message}` };
          return { ...result, pruned: pruned.data ?? 0 };
        }),
      ),
  );
};
