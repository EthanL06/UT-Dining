import { eq, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, router, Stack, useFocusEffect } from 'expo-router';
import { Bell, ChefHat, type LucideIcon, MapPin, Megaphone, Star } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { useDatabase } from '~/hooks/useDatabase';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useNotificationsStore } from '~/store/useNotificationsStore';
import { useTheme } from '~/utils/theme';

export interface Notification {
  id: string;
  title: string | null;
  body: string | null;
  redirect_url: string | null;
  type: string | null;
  sent_at: string | null;
  type_name: string;
  isRead: boolean;
}

const TYPE_STYLE: Record<string, { Icon: LucideIcon; color: string }> = {
  'Food Alert': { Icon: ChefHat, color: '#BF5700' },
  'Location Update': { Icon: MapPin, color: '#C8372D' },
  'Special Alert': { Icon: Star, color: '#D9822B' },
  'System Announcement': { Icon: Megaphone, color: '#636366' },
};
const DEFAULT_TYPE_STYLE = { Icon: Bell, color: '#333F48' };

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayGroup = (sentAt: string | null, today: Date) => {
  if (!sentAt) return 'Earlier';
  const days = Math.round(
    (startOfDay(today).getTime() - startOfDay(new Date(sentAt)).getTime()) / 86_400_000,
  );
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return 'Earlier';
};

const formatSentAt = (sentAt: string | null, group: string) => {
  if (!sentAt) return '';
  const date = new Date(sentAt);
  if (group === 'Today') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (group === 'Yesterday') return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationRow = ({
  notification,
  group,
  isFirst,
  onPress,
}: {
  notification: Notification;
  group: string;
  isFirst: boolean;
  onPress: (notification: Notification) => void;
}) => {
  const theme = useTheme();
  const { Icon, color } = TYPE_STYLE[notification.type_name] ?? DEFAULT_TYPE_STYLE;

  return (
    <Pressable disabled={!notification.redirect_url} onPress={() => onPress(notification)}>
      {({ pressed }) => (
        <View style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}>
          {!isFirst && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                left: 68,
                height: 0.5,
                backgroundColor: theme.separator,
              }}
            />
          )}
          <View className="flex-row items-start gap-x-3 py-3.5 pr-4 pl-5">
            {!notification.isRead && (
              <View
                accessibilityLabel="Unread"
                className="absolute top-[30px] left-[7px] size-[7px] rounded-full"
                style={{ backgroundColor: theme.tint }}
              />
            )}
            <View
              className="mt-0.5 size-9 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <Icon size={18} color="#FFFFFF" />
            </View>
            <View className="flex-1 gap-y-1">
              <View className="flex-row items-baseline justify-between gap-x-2">
                <Text
                  className={
                    notification.isRead
                      ? 'flex-1 font-semibold text-[16px]'
                      : 'flex-1 font-bold text-[16px]'
                  }
                  style={{ color: theme.label }}
                >
                  {notification.title}
                </Text>
                <Text className="text-[13px]" style={{ color: theme.secondaryLabel }}>
                  {formatSentAt(notification.sent_at, group)}
                </Text>
              </View>
              <Text className="text-[15px] leading-5" style={{ color: theme.secondaryLabel }}>
                {notification.body}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
};

const Notifications = () => {
  const theme = useTheme();
  const db = useDatabase();
  const { lastVisited, setLastVisited } = useNotificationsStore();

  useFocusEffect(
    useCallback(() => {
      return () => {
        setLastVisited(Date.now());
      };
    }, [setLastVisited]),
  );

  const lastSyncTime = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const { data: dbNotifications = [] } = useLiveQuery(
    db
      ?.select({
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

  const groups = useMemo(() => {
    const today = new Date();
    const grouped = new Map<string, Notification[]>();
    for (const notification of dbNotifications) {
      const isRead =
        lastVisited !== null &&
        notification.sent_at !== null &&
        new Date(notification.sent_at).getTime() <= lastVisited;
      const group = dayGroup(notification.sent_at, today);
      grouped.set(group, [
        ...(grouped.get(group) ?? []),
        { ...notification, type_name: notification.type_name || 'System Announcement', isRead },
      ]);
    }
    return ['Today', 'Yesterday', 'Earlier'].flatMap((name) => {
      const items = grouped.get(name);
      return items ? [{ name, items }] : [];
    });
  }, [dbNotifications, lastVisited]);

  const hasUnread = groups.some((group) => group.items.some((item) => !item.isRead));

  const handleNotificationPress = (notification: Notification) => {
    if (notification.redirect_url) {
      router.push(notification.redirect_url as Href);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: hasUnread
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setLastVisited(Date.now())}
                  hitSlop={8}
                  className="px-1.5"
                >
                  <Text className="font-semibold text-[16px]" style={{ color: theme.tint }}>
                    Read All
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
      >
        {groups.length === 0 ? (
          <View className="mt-16 items-center px-10">
            <Text className="font-semibold text-[17px]" style={{ color: theme.label }}>
              No Notifications Yet
            </Text>
            <Text
              className="mt-1.5 text-center text-[15px]"
              style={{ color: theme.secondaryLabel }}
            >
              We'll notify you about your favorite foods and dining location updates.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <GroupedSection key={group.name} header={group.name}>
              {group.items.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  group={group.name}
                  isFirst={index === 0}
                  onPress={handleNotificationPress}
                />
              ))}
            </GroupedSection>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default Notifications;
