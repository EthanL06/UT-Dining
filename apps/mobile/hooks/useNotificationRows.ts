import { eq, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useDatabase } from './useDatabase';

export const useNotificationRows = () => {
  const db = useDatabase();
  const lastSyncTime = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const { data = [] } = useLiveQuery(
    db
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
      .orderBy(sql`datetime(${schema.notifications.sent_at}) DESC`),
    [lastSyncTime],
  );
  return data;
};
