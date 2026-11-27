import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const BATCH_SIZE = 100;
console.log('🔍 Starting scheduled push notification function...');
Deno.serve(async (_req) => {
  try {
    const now = new Date();
    const centralTime = new Date(
      now.toLocaleString('en-US', {
        timeZone: 'America/Chicago',
      }),
    );
    console.log('🕐 Current Central Time:', centralTime.toISOString());
    const { data: scheduledNotifications, error: queryError } = await supabase
      .from('notifications')
      .select('*')
      .not('scheduled_at', 'is', null)
      .eq('sent', false)
      .gte('scheduled_at', centralTime.toISOString());

    if (queryError) {
      console.error('❌ Error querying scheduled notifications:', queryError);
      return new Response(
        JSON.stringify({
          error: 'Failed to query scheduled notifications',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('📋 Found scheduled notifications:', scheduledNotifications?.length || 0);
    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No scheduled notifications to send',
          processed: 0,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const { data: userDevices, error: devicesError } = await supabase
      .from('user_devices')
      .select('push_token');
    if (devicesError) {
      console.error('❌ Error fetching user devices:', devicesError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch user devices',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('📱 Total user devices:', userDevices?.length || 0);
    const pushTokens = [
      ...new Set(userDevices?.map((device) => device.push_token).filter(Boolean) || []),
    ];
    console.log('📨 Unique push tokens:', pushTokens.length);
    if (pushTokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No push tokens available',
          processed: 0,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const processedNotifications = [];
    for (const notification of scheduledNotifications) {
      console.log(`📤 Processing notification: ${notification.id}`);
      try {
        const tokenBatches = [];
        for (let i = 0; i < pushTokens.length; i += BATCH_SIZE) {
          tokenBatches.push(pushTokens.slice(i, i + BATCH_SIZE));
        }
        const sendPromises = tokenBatches.map(async (tokenBatch) => {
          const notificationMessage = {
            to: tokenBatch,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: {
              redirect_url: notification.redirect_url,
              type: notification.type,
              sent_at: new Date().toISOString(),
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
            body: JSON.stringify(notificationMessage),
          });
        });
        await Promise.all(sendPromises);
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            sent: true,
          })
          .eq('id', notification.id);
        if (updateError) {
          console.error(`❌ Error marking notification ${notification.id} as sent:`, updateError);
        } else {
          console.log(`✅ Notification ${notification.id} sent successfully`);
          processedNotifications.push({
            id: notification.id,
            title: notification.title,
            sent_to: pushTokens.length,
            scheduled_at: notification.scheduled_at,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing notification ${notification.id}:`, error);
      }
    }
    console.log(
      '📤 Returning response: ',
      JSON.stringify(
        {
          success: true,
          processed: processedNotifications.length,
          total_recipients: pushTokens.length,
          notifications: processedNotifications,
        },
        null,
        2,
      ),
    );
    return new Response(
      JSON.stringify({
        success: true,
        processed: processedNotifications.length,
        total_recipients: pushTokens.length,
        notifications: processedNotifications,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
