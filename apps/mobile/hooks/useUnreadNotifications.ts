import { sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { useDatabase } from '~/hooks/useDatabase';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useNotificationsStore } from '~/store/useNotificationsStore';
import { isNotificationVisible } from '~/utils/notificationVisibility';

export function useUnreadNotifications() {
  const db = useDatabase();
  const lastSyncTime = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const lastVisited = useNotificationsStore((state) => state.lastVisited);
  const visibleSince = useNotificationsStore((state) => state.visibleSince);

  const { data: allNotifications = [] } = useLiveQuery(
    db
      ?.select({
        id: schema.notifications.id,
        sent_at: schema.notifications.sent_at,
      })
      .from(schema.notifications)
      .orderBy(sql`datetime(${schema.notifications.sent_at}) DESC`),
    [lastSyncTime],
  );

  const unreadCount = useMemo(() => {
    const dbNotifications = allNotifications.filter((notification) =>
      isNotificationVisible(notification.sent_at, visibleSince),
    );
    if (lastVisited === null) {
      return dbNotifications.length;
    }

    return dbNotifications.filter((notification) => {
      if (!notification.sent_at) return false;
      const sentTime = new Date(notification.sent_at).getTime();
      return sentTime > lastVisited;
    }).length;
  }, [allNotifications, lastVisited, visibleSince]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
  };
}
