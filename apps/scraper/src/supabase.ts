import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ut-dining/supabase';

export const createSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_KEY are required to upload');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
};
