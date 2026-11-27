import * as Notifications from 'expo-notifications';
import { Bell, Send } from 'lucide-react-native';

import { GroupedSection } from '~/components/ui/Grouped';
import { sendTestPush } from '~/services/qa/testPush';
import { usePushNotificationsStore } from '~/store/usePushNotificationsStore';
import { ActionRow, COLORS, InfoRow, share, useActionStatus } from './shared';

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
      await sendTestPush(expoPushToken);
    });

  return (
    <GroupedSection
      header="Push Notifications"
      footer="Local fires in 3 seconds, so you can lock the phone. Remote goes through dev Supabase (qa-test-push), Expo and APNs to this phone only."
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
