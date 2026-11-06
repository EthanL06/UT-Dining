import { useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { router, Stack } from 'expo-router';
import {
  Accessibility,
  Bell,
  ChefHat,
  Code,
  Filter,
  Heart,
  HelpCircle,
  History,
  Info,
  type LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  RefreshCcw,
  Shield,
  Star,
  Type,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { Linking, ScrollView, Switch, Text, View } from 'react-native';
import { SheetManager, SheetProvider } from 'react-native-actions-sheet';

import { GroupedRow, GroupedSection, IconSquare } from '~/components/ui/Grouped';
import { useDatabase } from '~/hooks/useDatabase';
import { useLocationPermissions } from '~/hooks/useLocationPermissions';
import { forceMenuSync } from '~/hooks/useMenuSync';
import { useNotificationPermissions } from '~/hooks/useNotificationPermissions';
import { getAppInformation } from '~/services/database/database';
import type { AppInformation } from '~/services/database/schema';
import { getOrCreateDeviceId } from '~/services/device/deviceId';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { useTheme } from '~/utils/theme';
import { formatTimeSinceSync } from '~/utils/time';

const ITUNES_ITEM_ID = '6743042002';
const ROW_INSET = 58;

const ICON_COLORS = {
  red: '#E0463F',
  orange: '#BF5700',
  blue: '#0A84FF',
  indigo: '#3B3B8F',
  purple: '#8E5BD0',
  gray: '#8E8E93',
  green: '#2E9E4F',
  yellow: '#E3A857',
};

const SUPPORT_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  'Contact Support': { Icon: Mail, color: ICON_COLORS.blue },
  FAQ: { Icon: HelpCircle, color: ICON_COLORS.purple },
  'Privacy Policy': { Icon: Shield, color: ICON_COLORS.gray },
  'Source Code': { Icon: Code, color: ICON_COLORS.indigo },
};

const LinkRow = ({
  title,
  subtitle,
  Icon,
  color,
  isFirst,
  detail,
  onPress,
  testID,
  detailTestID,
}: {
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
  color: string;
  isFirst?: boolean;
  detail?: string;
  onPress?: () => void;
  testID?: string;
  detailTestID?: string;
}) => (
  <GroupedRow
    testID={testID}
    detailTestID={detailTestID}
    isFirst={isFirst}
    separatorInset={ROW_INSET}
    leading={<IconSquare Icon={Icon} color={color} />}
    title={title}
    subtitle={subtitle}
    detail={detail}
    showChevron={!!onPress}
    onPress={onPress}
  />
);

const ToggleRow = ({
  title,
  Icon,
  color,
  value,
  onToggle,
  isFirst,
  testID,
}: {
  title: string;
  Icon: LucideIcon;
  color: string;
  value: boolean;
  onToggle: () => void;
  isFirst?: boolean;
  testID: string;
}) => {
  const theme = useTheme();
  return (
    <GroupedRow
      isFirst={isFirst}
      separatorInset={ROW_INSET}
      leading={<IconSquare Icon={Icon} color={color} />}
      title={title}
      trailing={
        <Switch
          testID={testID}
          accessibilityLabel={title}
          value={value}
          onValueChange={onToggle}
          trackColor={{ true: theme.tint }}
        />
      }
    />
  );
};

const SyncDataRow = () => {
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const db = useDatabase();
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'failed'>('idle');
  const [currentTime, setCurrentTime] = React.useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const isSyncing = syncStatus === 'syncing';
  const timeSinceSync = lastSyncedAt === null ? Infinity : Math.max(0, currentTime - lastSyncedAt);

  const handleSync = async () => {
    if (!db || isSyncing) return;
    setSyncStatus('syncing');
    try {
      await forceMenuSync(db, queryClient);
      setCurrentTime(Date.now());
      setSyncStatus('idle');
    } catch (error) {
      setSyncStatus('failed');
      console.warn('Sync failed:', error);
    }
  };

  const detail = isSyncing
    ? 'Syncing…'
    : syncStatus === 'failed'
      ? 'Failed'
      : formatTimeSinceSync(timeSinceSync);

  return (
    <LinkRow
      isFirst
      title="Sync Data"
      testID="settings-sync-data"
      detailTestID="settings-sync-status"
      Icon={RefreshCcw}
      color={ICON_COLORS.green}
      detail={detail}
      onPress={isSyncing ? undefined : handleSync}
    />
  );
};

const PermissionRows = () => {
  const notifications = useNotificationPermissions();
  const location = useLocationPermissions();

  const open = (permission: typeof notifications | typeof location) => async () => {
    if (permission.isUndetermined) {
      await permission.requestPermissions();
    } else {
      Linking.openSettings();
    }
  };

  const label = (permission: typeof notifications | typeof location) =>
    permission.isGranted ? 'On' : 'Off';

  return (
    <>
      <LinkRow
        isFirst
        title="Notifications"
        Icon={Bell}
        color={ICON_COLORS.red}
        detail={label(notifications)}
        onPress={open(notifications)}
      />
      <LinkRow
        title="Location"
        subtitle="Shows where you are on the map"
        Icon={MapPin}
        color={ICON_COLORS.blue}
        detail={label(location)}
        onPress={open(location)}
      />
    </>
  );
};

const InformationSection = ({ appInfo }: { appInfo: AppInformation }) => {
  const theme = useTheme();
  const supportLinks = [...appInfo.support_links].sort((a, b) => a.order - b.order);
  const contributors = [...appInfo.credits_contributors]
    .sort((a, b) => a.order - b.order)
    .map((contributor) => contributor.name)
    .join(', ');

  return (
    <>
      <GroupedSection header="About">
        <View className="px-4 py-3.5">
          <Text className="mb-1 font-semibold text-[17px]" style={{ color: theme.label }}>
            {appInfo.about_title}
          </Text>
          <Text className="text-[15px] leading-5" style={{ color: theme.secondaryLabel }}>
            {appInfo.about_description}
          </Text>
        </View>
      </GroupedSection>

      <GroupedSection header="Credits">
        <LinkRow
          isFirst
          title="Ethan Lanting"
          subtitle="Lead Developer & Designer"
          Icon={Info}
          color={ICON_COLORS.orange}
          onPress={() => Linking.openURL('https://ethanlanting.dev')}
        />
        {contributors.length > 0 && (
          <GroupedRow
            separatorInset={ROW_INSET}
            leading={<IconSquare Icon={Users} color={ICON_COLORS.gray} />}
            title="Open Source Contributors"
            subtitle={contributors}
            multilineSubtitle
          />
        )}
        <LinkRow
          title="Longhorn Developers"
          subtitle="Adopted by"
          Icon={Code}
          color={ICON_COLORS.indigo}
          onPress={() => Linking.openURL('https://github.com/Longhorn-Developers')}
        />
      </GroupedSection>

      {supportLinks.length > 0 && (
        <GroupedSection header="Help & Support">
          {supportLinks.map((link, index) => {
            const style = SUPPORT_ICONS[link.label] ?? {
              Icon: HelpCircle,
              color: ICON_COLORS.gray,
            };
            return (
              <LinkRow
                key={link.id}
                isFirst={index === 0}
                title={link.label}
                Icon={style.Icon}
                color={style.color}
                onPress={() => Linking.openURL(link.url)}
              />
            );
          })}
        </GroupedSection>
      )}
    </>
  );
};

const SettingsPage = () => {
  const theme = useTheme();
  const {
    useColloquialNames,
    toggleColloquialNames,
    isDarkMode,
    toggleDarkMode,
    isColorBlindMode,
    toggleColorBlindMode,
  } = useSettingsStore();
  const { resetOnboarding } = useOnboardingStore();
  const { resetRatingPrompt } = useAppLaunchStore();
  const db = useDatabase();
  const [appInfo, setAppInfo] = React.useState<AppInformation | null>(null);
  const deviceId = getOrCreateDeviceId();

  React.useEffect(() => {
    if (!db) return;
    getAppInformation(db).then(setAppInfo);
  }, [db]);

  return (
    <SheetProvider context="settings">
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
      >
        <GroupedSection header="Quick Links">
          <LinkRow
            isFirst
            title="Favorites"
            testID="settings-favorites"
            Icon={Heart}
            color={ICON_COLORS.red}
            onPress={() => router.push('/favorites')}
          />
          <LinkRow
            title="Meal Plan"
            testID="settings-meal-plan"
            Icon={ChefHat}
            color={ICON_COLORS.orange}
            onPress={() => router.push('/meal-plan')}
          />
          <LinkRow
            title="Filters"
            testID="settings-filters"
            Icon={Filter}
            color={ICON_COLORS.blue}
            onPress={() => SheetManager.show('filters', { context: 'settings' })}
          />
        </GroupedSection>

        <GroupedSection header="Display">
          <ToggleRow
            isFirst
            title="Dark Mode"
            testID="settings-dark-mode-switch"
            Icon={Moon}
            color={ICON_COLORS.indigo}
            value={isDarkMode}
            onToggle={toggleDarkMode}
          />
          <ToggleRow
            title="Colorblind Mode"
            testID="settings-colorblind-switch"
            Icon={Accessibility}
            color={ICON_COLORS.purple}
            value={isColorBlindMode}
            onToggle={toggleColorBlindMode}
          />
          <ToggleRow
            title="Use Colloquial Names"
            testID="settings-colloquial-names-switch"
            Icon={Type}
            color={ICON_COLORS.gray}
            value={useColloquialNames}
            onToggle={toggleColloquialNames}
          />
        </GroupedSection>

        <GroupedSection header="Data">
          <SyncDataRow />
        </GroupedSection>

        <GroupedSection header="App Permissions">
          <PermissionRows />
        </GroupedSection>

        <GroupedSection header="Feedback">
          <LinkRow
            isFirst
            title="Submit Suggestions"
            subtitle="Suggest a feature or report a bug"
            Icon={MessageSquare}
            color={ICON_COLORS.blue}
            onPress={() => Linking.openURL('https://utdining.userjot.com')}
          />
          <LinkRow
            title="Enjoying the app?"
            subtitle="Leave a quick review. It means a lot!"
            Icon={Star}
            color={ICON_COLORS.yellow}
            onPress={() =>
              Linking.openURL(
                `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${ITUNES_ITEM_ID}?action=write-review`,
              )
            }
          />
          <LinkRow
            title="Changelog"
            Icon={History}
            color={ICON_COLORS.gray}
            onPress={() => Linking.openURL('https://utdining.userjot.com/updates')}
          />
        </GroupedSection>

        {__DEV__ && (
          <GroupedSection header="Development (only visible in dev mode)">
            <LinkRow
              isFirst
              title="Reset Onboarding"
              Icon={RefreshCcw}
              color={ICON_COLORS.gray}
              onPress={resetOnboarding}
            />
            <LinkRow
              title="Reset Rating Prompt"
              subtitle="Reset the rating prompt to test it again"
              Icon={RefreshCcw}
              color={ICON_COLORS.gray}
              onPress={resetRatingPrompt}
            />
          </GroupedSection>
        )}

        {appInfo && <InformationSection appInfo={appInfo} />}

        <View className="mt-1 items-center">
          <Text className="text-[13px]" style={{ color: theme.secondaryLabel }}>
            Version {Application.nativeApplicationVersion}
          </Text>
          {deviceId && (
            <Text className="mt-1 text-[10px]" style={{ color: theme.tertiaryLabel }}>
              {deviceId}
            </Text>
          )}
        </View>
      </ScrollView>
    </SheetProvider>
  );
};

export default SettingsPage;
