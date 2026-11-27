import { eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { log } from '~/utils/log';
import * as schema from './schema';

export const getNotificationTypes = async (
  db: ExpoSQLiteDatabase<typeof schema>,
): Promise<schema.NotificationType[]> => {
  const data = await db.select().from(schema.notification_types).execute();
  return data;
};

export const getNotifications = async (
  db: ExpoSQLiteDatabase<typeof schema>,
): Promise<(schema.Notification & { type_name: string })[]> => {
  const data = await db
    .select({
      id: schema.notifications.id,
      title: schema.notifications.title,
      body: schema.notifications.body,
      redirect_url: schema.notifications.redirect_url,
      type: schema.notifications.type,
      sent_at: schema.notifications.sent_at,
      type_name: schema.notification_types.name,
    })
    .from(schema.notifications)
    .leftJoin(
      schema.notification_types,
      eq(schema.notifications.type, schema.notification_types.id),
    )
    .orderBy(sql`datetime(${schema.notifications.sent_at}) DESC`)
    .execute();

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    redirect_url: row.redirect_url,
    type: row.type,
    sent_at: row.sent_at,
    type_name: row.type_name || 'system_announcement',
  }));
};

export const insertNotification = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  notificationData: {
    id?: string;
    title: string;
    body: string;
    sent_at: string;
    redirect_url?: string;
    type?: string;
  },
): Promise<void> => {
  try {
    const notificationId =
      notificationData.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const existingNotification = await db
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(eq(schema.notifications.id, notificationId))
      .get();

    if (existingNotification) {
      log.debug('Notification already exists, skipping insert.');
      return;
    }

    await db
      .insert(schema.notifications)
      .values({
        id: notificationId,
        title: notificationData.title,
        body: notificationData.body,
        redirect_url: notificationData.redirect_url || null,
        type: notificationData.type || null,
        sent_at: notificationData.sent_at,
      })
      .execute();

    log.debug('Notification inserted into SQLite database', { notificationId });
  } catch (error) {
    log.error('Error inserting notification into SQLite', error);
    throw error;
  }
};
