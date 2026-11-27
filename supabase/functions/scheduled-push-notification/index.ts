import { log } from '../_shared/log.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { broadcast, createDeviceStore, json, type PushReport } from '../_shared/push.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const devices = createDeviceStore(supabase);

Deno.serve(async (_req) => {
  try {
    const now = new Date().toISOString();
    const { data: due, error: queryError } = await supabase
      .from('notifications')
      .select('id, title, body, redirect_url, type, scheduled_at')
      .not('scheduled_at', 'is', null)
      .eq('sent', false)
      .lte('scheduled_at', now)
      .order('scheduled_at');

    if (queryError) {
      log.error('Failed to query scheduled notifications:', queryError);
      return json({ error: 'Failed to query scheduled notifications' }, 500);
    }
    if (!due || due.length === 0) {
      return json({ success: true, message: 'No scheduled notifications are due', processed: 0 });
    }

    const processed: (PushReport & { id: string; scheduled_at: string | null })[] = [];
    for (const notification of due) {
      const { data: claimed, error: claimError } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('id', notification.id)
        .eq('sent', false)
        .select('id');
      if (claimError) {
        log.error(`Failed to claim notification ${notification.id}:`, claimError);
        continue;
      }
      if (!claimed || claimed.length === 0) continue;

      const report = await broadcast(
        devices,
        {
          title: notification.title,
          body: notification.body,
          data: {
            redirect_url: notification.redirect_url,
            type: notification.type,
            sent_at: new Date().toISOString(),
          },
        },
        { accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') },
      );

      if (report.recipients > 0 && report.accepted === 0) {
        log.error(`Expo accepted none of notification ${notification.id}:`, report.errors);
        await supabase.from('notifications').update({ sent: false }).eq('id', notification.id);
      }
      processed.push({ id: notification.id, scheduled_at: notification.scheduled_at, ...report });
    }

    log.info('Scheduled push run:', JSON.stringify(processed));
    return json({ success: true, processed: processed.length, notifications: processed });
  } catch (error) {
    log.error('Unexpected error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
