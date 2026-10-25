import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ut-dining/supabase';
import { getOrCreateDeviceId } from '~/services/device/deviceId';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl as string, supabaseAnonKey as string, {
  global: {
    headers: {
      'x-device-id': getOrCreateDeviceId(),
    },
  },
});
