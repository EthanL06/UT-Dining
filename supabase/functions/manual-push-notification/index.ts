import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const BATCH_SIZE = 100;

console.log('🔍 Starting manual push notification function...');

const isAllowedCaller = async (req: Request) => {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return false;
  if (authorization === `Bearer ${serviceRoleKey}`) return true;
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await caller.rpc('is_dashboard_admin');
  return data === true;
};

Deno.serve(async (req) => {
  if (!(await isAllowedCaller(req))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { title, body, redirect_url, type } = await req.json();

  if (!type) {
    return new Response(JSON.stringify({ error: 'Missing required field: type (UUID)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: insertError } = await supabase.from('notifications').insert({
    title,
    body,
    redirect_url,
    sent: true,
    type,
  });

  if (insertError) {
    console.error('❌ Failed to insert notification:', insertError);
    return new Response(
      JSON.stringify({ error: 'Failed to record notification', details: insertError }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { data: userDevices, error: devicesError } = await supabase
    .from('user_devices')
    .select('push_token');

  if (!userDevices) {
    console.error('❌ Failed to fetch user devices:', devicesError);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch user devices', details: devicesError }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  console.log('🔍 User devices:', JSON.stringify(userDevices, null, 2));

  const pushTokens = [...new Set(userDevices.map((device) => device.push_token))];

  const tokenBatches = [];
  for (let i = 0; i < pushTokens.length; i += BATCH_SIZE) {
    tokenBatches.push(pushTokens.slice(i, i + BATCH_SIZE));
  }

  const sendPromises = tokenBatches.map((tokenBatch) => {
    const message = {
      to: tokenBatch,
      sound: 'default',
      title,
      body,
      data: {
        redirect: redirect_url,
      },
    };
    return fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify(message),
    });
  });

  await Promise.all(sendPromises);

  return new Response(
    JSON.stringify({
      success: true,
      sent: pushTokens.length,
      title,
      body,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
