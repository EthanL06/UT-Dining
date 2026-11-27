import { useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import * as Updates from 'expo-updates';
import {
  Bell,
  Download,
  Filter,
  Heart,
  History,
  Inbox,
  type LucideIcon,
  Palette,
  RefreshCcw,
  Rocket,
  Send,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
  Wrench,
} from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, Share, View } from 'react-native';
import { GroupedRow, GroupedSection, IconSquare } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { useDatabase } from '~/hooks/useDatabase';
import { forceMenuSync } from '~/hooks/useMenuSync';
import { useServiceStatus } from '~/hooks/useServiceStatus';
import * as schema from '~/services/database/schema';
import { getOrCreateDeviceId } from '~/services/device/deviceId';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import {
  refreshChangelog,
  useChangelogPromptStore,
  useChangelogStore,
} from '~/store/useChangelogStore';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useFiltersStore } from '~/store/useFiltersStore';
import { useMealPlanStore } from '~/store/useMealPlanStore';
import { useNotificationsStore } from '~/store/useNotificationsStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { usePushNotificationsStore } from '~/store/usePushNotificationsStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { isDevVariant } from '~/utils/appVariant';
import { describeBackend } from '~/utils/backend';
import { haptics } from '~/utils/haptics';
import { SERVICE_STATUS_COLORS } from '~/utils/serviceStatus';
import { useTheme } from '~/utils/theme';
import { formatTimeSinceSync } from '~/utils/time';

const ROW_INSET = 58;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const COLORS = {
  orange: '#BF5700',
  blue: '#0A84FF',
  green: '#2E9E4F',
  red: '#E0463F',
  purple: '#8E5BD0',
  yellow: '#E3A857',
  gray: '#8E8E93',
  indigo: '#3B3B8F',
};

type ActionStatus = 'running' | 'done' | 'failed';

const STATUS_LABELS: Record<ActionStatus, string> = {
  running: 'Working…',
  done: 'Done',
  failed: 'Failed',
};

const useActionStatus = () => {
  const [statuses, setStatuses] = React.useState<Record<string, ActionStatus>>({});

  const run = React.useCallback(async (key: string, action: () => unknown) => {
    setStatuses((current) => ({ ...current, [key]: 'running' }));
    try {
      await action();
      setStatuses((current) => ({ ...current, [key]: 'done' }));
      haptics.success();
    } catch (error) {
      setStatuses((current) => ({ ...current, [key]: 'failed' }));
      haptics.error();
      Alert.alert('Failed', error instanceof Error ? error.message : String(error));
    }
  }, []);

  const detail = (key: string) => {
    const status = statuses[key];
    return status ? STATUS_LABELS[status] : undefined;
  };

  return { run, detail, isRunning: (key: string) => statuses[key] === 'running' };
};

const confirm = (title: string, message: string, onConfirm: () => void) =>
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: onConfirm },
  ]);

const share = (message: string) => {
  Share.share({ message }).catch(() => {});
};

const ActionRow = ({
  title,
  subtitle,
  Icon,
  color,
  isFirst,
  detail,
  onPress,
  testID,
}: {
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
  color: string;
  isFirst?: boolean;
  detail?: string;
  onPress?: () => void;
  testID?: string;
}) => (
  <GroupedRow
    testID={testID}
    isFirst={isFirst}
    separatorInset={ROW_INSET}
    leading={<IconSquare Icon={Icon} color={color} />}
    title={title}
    subtitle={subtitle}
    detail={detail}
    onPress={onPress}
  />
);

const InfoRow = ({
  label,
  value,
  isFirst,
  valueColor,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  isFirst?: boolean;
  valueColor?: string;
  onPress?: () => void;
  testID?: string;
}) => {
  return (
    <GroupedRow
      testID={testID}
      isFirst={isFirst}
      title={label}
      onPress={onPress}
      trailing={
        <Text
          variant="subheadline"
          numberOfLines={1}
          className="max-w-[60%] text-right"
          tone="secondary"
          color={valueColor}
        >
          {value}
        </Text>
      }
    />
  );
};

const latestVersion = () => useChangelogStore.getState().entries[0]?.version ?? '1.0.0';

const PromptsSection = () => {
  const showPrompt = useChangelogPromptStore((state) => state.showPrompt);
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);
  const resetChangelog = useChangelogStore((state) => state.resetChangelog);
  const resetRatingPrompt = useAppLaunchStore((state) => state.resetRatingPrompt);
  const { run, detail } = useActionStatus();

  const showWhatsNew = async () => {
    await refreshChangelog();
    showPrompt({ kind: 'whats-new', version: latestVersion(), preview: true });
  };

  const showUpdate = async (required: boolean) => {
    await refreshChangelog();
    showPrompt({
      kind: 'update',
      version: latestVersion(),
      required,
      releaseNotes: null,
      preview: true,
    });
  };

  return (
    <GroupedSection
      header="Prompts"
      footer="Required update is dismissible only in this dev build. The App Store build keeps it blocking."
    >
      <ActionRow
        isFirst
        testID="qa-replay-onboarding"
        title="Replay Onboarding"
        Icon={Rocket}
        color={COLORS.orange}
        onPress={() => {
          resetOnboarding();
          router.navigate('/');
        }}
      />
      <ActionRow
        testID="qa-show-whats-new"
        title="Show What's New"
        Icon={Sparkles}
        color={COLORS.purple}
        onPress={showWhatsNew}
      />
      <ActionRow
        testID="qa-show-update-available"
        title="Show Update Available"
        Icon={Download}
        color={COLORS.blue}
        onPress={() => showUpdate(false)}
      />
      <ActionRow
        testID="qa-show-update-required"
        title="Show Update Required"
        Icon={TriangleAlert}
        color={COLORS.red}
        onPress={() => showUpdate(true)}
      />
      <ActionRow
        testID="qa-reset-changelog"
        title="Reset Changelog State"
        subtitle="What's New and updates show again"
        Icon={History}
        color={COLORS.gray}
        detail={detail('changelog')}
        onPress={() => run('changelog', resetChangelog)}
      />
      <ActionRow
        testID="qa-show-rating"
        title="Show Rating Prompt"
        subtitle="iOS may skip it if shown recently"
        Icon={Star}
        color={COLORS.yellow}
        detail={detail('rating')}
        onPress={() => run('rating', () => StoreReview.requestReview())}
      />
      <ActionRow
        testID="qa-reset-rating"
        title="Reset Rating Prompt"
        subtitle="Shows again on the second launch"
        Icon={RefreshCcw}
        color={COLORS.gray}
        detail={detail('resetRating')}
        onPress={() => run('resetRating', resetRatingPrompt)}
      />
    </GroupedSection>
  );
};

const DataSection = () => {
  const db = useDatabase();
  const queryClient = useQueryClient();
  const setMenuDayVersions = useDataSyncStore((state) => state.setMenuDayVersions);
  const resetFilters = useFiltersStore((state) => state.resetFilters);
  const setLastVisited = useNotificationsStore((state) => state.setLastVisited);
  const { run, detail, isRunning } = useActionStatus();

  const refreshScreens = () =>
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'menuSync' });

  const syncNow = () => {
    if (isRunning('sync')) return;
    run('sync', () => forceMenuSync(db, queryClient));
  };

  const redownload = () => {
    if (isRunning('redownload')) return;
    run('redownload', async () => {
      setMenuDayVersions({});
      await forceMenuSync(db, queryClient);
    });
  };

  const clearFavorites = () =>
    confirm('Clear favorites?', 'Removes every favorite on this phone.', () =>
      run('favorites', async () => {
        await db.delete(schema.favorites).execute();
        await refreshScreens();
      }),
    );

  const clearMealPlans = () =>
    confirm('Clear meal plans?', 'Removes the meal plan for every day.', () =>
      run('mealPlans', () => useMealPlanStore.setState({ plans: {} })),
    );

  const resetDisplay = () =>
    run('display', () =>
      useSettingsStore.setState({ useColloquialNames: false, isColorBlindMode: false }),
    );

  return (
    <GroupedSection header="Data">
      <ActionRow
        isFirst
        testID="qa-force-sync"
        title="Force Menu Sync"
        subtitle="Fetches only days whose version changed"
        Icon={RefreshCcw}
        color={COLORS.green}
        detail={detail('sync')}
        onPress={syncNow}
      />
      <ActionRow
        testID="qa-redownload-menus"
        title="Re-download All Menus"
        subtitle="Forgets cached versions, then syncs"
        Icon={Download}
        color={COLORS.green}
        detail={detail('redownload')}
        onPress={redownload}
      />
      <ActionRow
        testID="qa-clear-favorites"
        title="Clear Favorites"
        Icon={Heart}
        color={COLORS.red}
        detail={detail('favorites')}
        onPress={clearFavorites}
      />
      <ActionRow
        testID="qa-clear-meal-plans"
        title="Clear All Meal Plans"
        Icon={Trash2}
        color={COLORS.red}
        detail={detail('mealPlans')}
        onPress={clearMealPlans}
      />
      <ActionRow
        testID="qa-reset-filters"
        title="Reset Filters"
        Icon={Filter}
        color={COLORS.blue}
        detail={detail('filters')}
        onPress={() => run('filters', resetFilters)}
      />
      <ActionRow
        testID="qa-reset-display"
        title="Reset Display Settings"
        subtitle="Colorblind and colloquial names off"
        Icon={Palette}
        color={COLORS.indigo}
        detail={detail('display')}
        onPress={resetDisplay}
      />
      <ActionRow
        testID="qa-mark-notifications-unread"
        title="Mark Notifications Unread"
        subtitle="Brings the tab badge back"
        Icon={Inbox}
        color={COLORS.gray}
        detail={detail('unread')}
        onPress={() => run('unread', () => setLastVisited(0))}
      />
    </GroupedSection>
  );
};

const PushSection = () => {
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

const BuildInfoSection = () => {
  const theme = useTheme();
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const menuDayVersions = useDataSyncStore((state) => state.menuDayVersions);
  const { data: status, refetch } = useServiceStatus();
  const backend = describeBackend(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const deviceId = getOrCreateDeviceId();
  const gitCommit = Constants.expoConfig?.extra?.gitCommit as string | null | undefined;
  const cachedDays = Object.keys(menuDayVersions).sort();

  const backendLabel = {
    dev: 'Dev',
    prod: 'PRODUCTION',
    local: 'Local',
    unknown: 'Unknown',
  }[backend.kind];

  const info = [
    `Variant: ${isDevVariant ? 'Dev' : 'App Store'}${__DEV__ ? ' (Metro)' : ''}`,
    `Bundle: ${Application.applicationId}`,
    `Version: ${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`,
    `Commit: ${gitCommit ?? 'unknown'}`,
    `JS: ${Updates.isEmbeddedLaunch ? 'embedded' : (Updates.updateId ?? 'unknown')}`,
    `Backend: ${backendLabel} ${backend.host}`,
    `Device ID: ${deviceId}`,
    `Device: ${Device.modelName ?? 'unknown'}, iOS ${Device.osVersion ?? '?'}`,
  ].join('\n');

  return (
    <GroupedSection header="Build & Environment" footer="Tap a row to share or copy it.">
      <InfoRow isFirst label="Variant" value={isDevVariant ? 'Dev' : 'App Store'} />
      <InfoRow
        label="Version"
        value={`${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`}
      />
      <InfoRow
        label="Commit"
        value={gitCommit ?? 'unknown'}
        onPress={gitCommit ? () => share(gitCommit) : undefined}
      />
      <InfoRow label="JS Bundle" value={Updates.isEmbeddedLaunch ? 'Embedded' : 'OTA update'} />
      <InfoRow
        testID="qa-backend"
        label="Backend"
        value={`${backendLabel} · ${backend.host.split('.')[0]}`}
        valueColor={backend.kind === 'prod' ? COLORS.red : undefined}
        onPress={() => share(backend.host)}
      />
      <InfoRow
        label="Last Sync"
        value={formatTimeSinceSync(
          lastSyncedAt === null ? Infinity : Math.max(0, Date.now() - lastSyncedAt),
        )}
      />
      <InfoRow
        label="Cached Days"
        value={cachedDays.length > 0 ? `${cachedDays[0]} to ${cachedDays.at(-1)}` : 'None'}
      />
      <GroupedRow
        title="Service Status"
        onPress={() => refetch()}
        trailing={
          <View className="flex-row items-center gap-x-1.5">
            {status && (
              <View
                className="size-2 rounded-full"
                style={{ backgroundColor: SERVICE_STATUS_COLORS[status.health] }}
              />
            )}
            <Text variant="subheadline" tone="secondary">
              {status?.label ?? 'Unavailable'}
            </Text>
          </View>
        }
      />
      <InfoRow label="Device ID" value={deviceId.slice(0, 8)} onPress={() => share(deviceId)} />
      <GroupedRow
        testID="qa-copy-build-info"
        title="Share All Build Info"
        titleColor={theme.tint}
        onPress={() => share(info)}
      />
    </GroupedSection>
  );
};

const QAScreen = () => {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'QA Menu', headerLargeTitle: false }} />
      <ScrollView
        testID="qa-screen"
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
      >
        <View
          className="mx-4 mb-5 flex-row items-center gap-x-3 rounded-[20px] px-4 py-3"
          style={{ backgroundColor: theme.tintSoft }}
        >
          <Wrench size={18} color={theme.tint} />
          <Text variant="subheadline" paragraph className="flex-1">
            Only in UT Dining (Dev). These tools change data on this phone only.
          </Text>
        </View>
        <PromptsSection />
        <DataSection />
        <PushSection />
        <BuildInfoSection />
      </ScrollView>
    </>
  );
};

export default QAScreen;
