import * as Notifications from 'expo-notifications';
import { Bell, Send } from 'lucide-react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { usePushNotificationsStore } from '~/store/usePushNotificationsStore';
import { ActionRow, COLORS, EXPO_PUSH_URL, InfoRow, share, useActionStatus } from './shared';

export const PushSection = () => {
  const expoPushToken = usePushNotificationsStore((state) => state.expoPushToken);
  const { run, detail } = useActionStatus();

  const sendLocal = () =>
    run('local', () =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'QA test notification',
          body: `Local notification sent at ${new Date().toLocaleTimeString()}`,
          data: { type: 'system_announcement' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
      }),
    );

  const sendRemote = () =>
    run('remote', async () => {
      if (!expoPushToken) throw new Error('No push token yet. Allow notifications first.');
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: expoPushToken,
          title: 'QA test push',
          body: `Sent through Expo at ${new Date().toLocaleTimeString()}`,
          data: { type: 'system_announcement' },
        }),
      });
      const result = (await response.json()) as {
        data?: { status?: string; message?: string };
        errors?: { message?: string }[];
      };
      const failure = result.errors?.[0]?.message ?? result.data?.message;
      if (!response.ok || result.data?.status !== 'ok') {
        throw new Error(failure ?? `Expo returned ${response.status}`);
      }
    });

  return (
    <GroupedSection
      header="Push Notifications"
      footer="Local fires in 3 seconds, so you can lock the phone. Remote goes through Expo and APNs to this phone only."
    >
      <ActionRow
        isFirst
        testID="qa-send-local-notification"
        title="Send Local Notification"
        Icon={Bell}
        color={COLORS.red}
        detail={detail('local')}
        onPress={sendLocal}
      />
      <ActionRow
        testID="qa-send-remote-push"
        title="Send Test Push to This Phone"
        Icon={Send}
        color={COLORS.red}
        detail={detail('remote')}
        onPress={sendRemote}
      />
      <InfoRow
        testID="qa-push-token"
        label="Push Token"
        value={expoPushToken ? expoPushToken.replace('ExponentPushToken', '') : 'None yet'}
        onPress={expoPushToken ? () => share(expoPushToken) : undefined}
      />
    </GroupedSection>
  );
};
