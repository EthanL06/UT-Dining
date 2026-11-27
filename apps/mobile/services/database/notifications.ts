import { eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { log } from '~/utils/log';
import * as schema from './schema';

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
