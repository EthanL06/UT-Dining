import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ut-dining/supabase';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'admin-auth' });

export const adminClient = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
  {
    auth: {
      flowType: 'implicit',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'admin-session',
      storage: {
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => {
          storage.remove(key);
        },
      },
    },
  },
);
