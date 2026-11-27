import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { broadcast, createDeviceStore, json } from '../_shared/push.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const devices = createDeviceStore(supabase);

const isProjectSecretKey = async (key: string) => {
  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  return !error;
};

const isAllowedCaller = async (req: Request) => {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return false;
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (token === serviceRoleKey) return true;
  if (token.startsWith('sb_secret_')) return isProjectSecretKey(token);
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await caller.rpc('is_dashboard_admin');
  return data === true;
};

Deno.serve(async (req) => {
  if (!(await isAllowedCaller(req))) return json({ error: 'Forbidden' }, 403);

  const { title, body, redirect_url, type } = await req.json();

  if (typeof title !== 'string' || typeof body !== 'string' || !title.trim() || !body.trim()) {
    return json({ error: 'title and body must be non-empty strings' }, 400);
  }
  if (!type) return json({ error: 'Missing required field: type (UUID)' }, 400);

  const { error: insertError } = await supabase.from('notifications').insert({
    title,
    body,
    redirect_url,
    sent: true,
    type,
  });

  if (insertError) {
    console.error('Failed to insert notification:', insertError);
    return json({ error: 'Failed to record notification', details: insertError }, 500);
  }

  try {
    const report = await broadcast(
      devices,
      {
        title,
        body,
        data: { redirect_url, type, sent_at: new Date().toISOString() },
      },
      { accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') },
    );
    console.log('Manual push run:', JSON.stringify(report));
    return json({ success: true, sent: report.accepted, title, body, ...report });
  } catch (error) {
    console.error('Failed to send manual push:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to send' }, 500);
  }
});
