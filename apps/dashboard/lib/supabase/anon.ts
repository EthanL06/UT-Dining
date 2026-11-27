import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@ut-dining/supabase';
import { getSupabaseEnv } from './env';

export function createAnonClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
