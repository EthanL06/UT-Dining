import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ut-dining/supabase';
import { getOrCreateDeviceId } from '~/services/device/deviceId';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const REQUEST_TIMEOUT_MS = 20_000;

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  init?.signal?.addEventListener('abort', forwardAbort);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', forwardAbort);
  }
};

export const supabase = createClient<Database>(supabaseUrl as string, supabaseAnonKey as string, {
  global: {
    fetch: fetchWithTimeout,
    headers: {
      'x-device-id': getOrCreateDeviceId(),
    },
  },
});
