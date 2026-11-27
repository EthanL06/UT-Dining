import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { json, sendPush } from '../_shared/push.ts';

const DEV_PROJECT_REF = 'bdnlfwyfgvaployvrivk';
const TOKEN_PATTERN = /^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]{10,}\]$/;

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const isDevProject = supabaseUrl.includes(DEV_PROJECT_REF);

Deno.serve(async (req) => {
  if (!isDevProject) return json({ error: 'qa-test-push only runs on the dev project' }, 404);
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const payload = await req.json().catch(() => null);
  const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
  if (!TOKEN_PATTERN.test(token)) return json({ error: 'token must be an Expo push token' }, 400);

  const sentAt = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Chicago' });
  const { report } = await sendPush(
    [token],
    {
      title: 'QA test push',
      body: `Sent through dev Supabase and Expo at ${sentAt}`,
      data: { type: 'system_announcement' },
    },
    { accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') },
  );

  if (report.accepted === 1) return json({ success: true });
  return json({ error: report.errors[0] ?? 'Expo did not accept the push' }, 502);
});
