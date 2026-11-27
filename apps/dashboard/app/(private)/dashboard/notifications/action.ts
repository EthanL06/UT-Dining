'use server';

import { checkNotification, formatCentral } from '@ut-dining/core';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';

export interface NotificationData {
  title: string;
  body: string;
  redirectLink?: string;
  scheduledAt?: Date;
  isScheduled: boolean;
  notification_type_id: string;
}

export async function sendNotification(data: NotificationData) {
  const checked = checkNotification({
    title: data.title,
    body: data.body,
    redirectUrl: data.redirectLink,
  });
  if (!checked.ok) return { success: false, message: checked.error };

  const supabase = await createClient();

  const { data: response, error } = await supabase.functions.invoke('manual-push-notification', {
    body: {
      title: checked.value.title,
      body: checked.value.body,
      redirect_url: checked.value.redirectUrl,
      type: data.notification_type_id,
    },
  });

  if (error) {
    log.error('❌ Error sending notification:', error);
    return {
      success: false,
      message: error.message,
    };
  }

  log.info('✅ Notification sent successfully');

  return {
    success: true,
    message: `Notification sent successfully to ${response.sent} devices.`,
  };
}

export async function scheduleNotification(data: NotificationData) {
  if (!data.scheduledAt) {
    return {
      success: false,
      message: 'Scheduled time is required',
    };
  }

  const checked = checkNotification({
    title: data.title,
    body: data.body,
    redirectUrl: data.redirectLink,
    scheduledAt: data.scheduledAt,
  });
  if (!checked.ok) return { success: false, message: checked.error };
  const scheduledAt = checked.value.scheduledAt ?? new Date(data.scheduledAt);

  const supabase = await createClient();

  const { error } = await supabase.from('notifications').insert({
    title: checked.value.title,
    body: checked.value.body,
    redirect_url: checked.value.redirectUrl,
    scheduled_at: scheduledAt.toISOString(),
    type: data.notification_type_id,
  });

  if (error) {
    log.error('❌ Error scheduling notification:', error);
    return {
      success: false,
      message: error.message,
    };
  }

  log.info('✅ Notification scheduled successfully');

  return {
    success: true,
    message: `Notification scheduled successfully for ${formatCentral(scheduledAt, { dateStyle: 'medium', timeStyle: 'short', timeZoneName: 'short' })}`,
  };
}

export async function getScheduledNotifications() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*, notification_types(name)')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true });

  if (error) {
    log.error('❌ Error fetching scheduled notifications:', error);
    return [];
  }

  return data || [];
}

export async function deleteScheduledNotification(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('notifications').delete().eq('id', id);

  if (error) {
    log.error('❌ Error deleting scheduled notification:', error);
    return {
      success: false,
      message: error.message,
    };
  }

  log.info('✅ Scheduled notification deleted successfully');

  return {
    success: true,
    message: 'Scheduled notification deleted successfully',
  };
}

export async function getNotificationTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notification_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    log.error('❌ Error fetching notification types:', error);
    return [];
  }

  return data || [];
}
