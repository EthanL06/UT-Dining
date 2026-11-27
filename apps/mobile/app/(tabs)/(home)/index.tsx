import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toCentralTime } from '@ut-dining/core';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import * as Network from 'expo-network';
import { Link, router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { Heart } from 'lucide-react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FilterType } from '~/components/FilterBar';
import { RefreshDrop } from '~/components/home/RefreshDrop';
import { MealPlanIcon } from '~/components/MealPlanIcon';
import OnboardingScreen from '~/components/onboarding/OnboardingScreen';
import { ServiceStatusBanner } from '~/components/ServiceStatusBanner';
import { GroupedRow, GroupedSection, StatusDot } from '~/components/ui/Grouped';
import { Image } from '~/components/ui/Image';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import { forceMenuSync, useMenuSync } from '~/hooks/useMenuSync';
import { useNow } from '~/hooks/useNow';
import type { DrizzleDB } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { haptics } from '~/utils/haptics';
import { homeView, toSyncStatus } from '~/utils/homeView';
import { displayLocationName } from '~/utils/locationName';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { log } from '~/utils/log';
import { PULL_TRIGGER, type RefreshResult, type RefreshStatus } from '~/utils/pullRefresh';
import { readCachedMenuData } from '~/utils/queries';
import { type Theme, useTheme } from '~/utils/theme';
import {
  formatTimeSinceSync,
  getLocationStatusText,
  getMinutesUntilClose,
  statusDotTone,
  timeOfDay,
} from '~/utils/time';
import * as schema from '../../../services/database/schema';

const SPLASH_SCREEN_DURATION = 200;

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: SPLASH_SCREEN_DURATION,
  fade: true,
});

type LocationEntry = {
  location: schema.LocationWithType;
  isOpen: boolean;
  subtitle: string;
  closingInMinutes: number | null;
};

const closingSoonMinutes = (location: schema.LocationWithType, isOpen: boolean, now: Date) => {
  const minutes = getMinutesUntilClose(location, now);
  return statusDotTone(isOpen, minutes) === 'closingSoon' ? minutes : null;
};

const sortLocationsByStatus = (
  locations: schema.LocationWithType[],
  locationTypes: schema.LocationType[],
  filter: FilterType,
  db: DrizzleDB,
  currentTime: Date,
) => {
  const targetType =
    filter === 'all' ? undefined : locationTypes.find((type) => type.name === filter);
  const filteredLocations = targetType
    ? locations.filter((location) => location.type_id === targetType.id)
    : locations;

  const locationIdsWithMenus = getLocationIdsWithMenus(db, getTodayInCentralTime());
  const items: LocationEntry[] = filteredLocations.map((location) => {
    const isOpen = isLocationOpenNow(location, locationIdsWithMenus, currentTime);
    return {
      location,
      isOpen,
      subtitle: getLocationStatusText(location, isOpen, currentTime),
      closingInMinutes: closingSoonMinutes(location, isOpen, currentTime),
    };
  });

  return {
    open: items.filter((item) => item.isOpen),
    closed: items.filter((item) => !item.isOpen),
  };
};

const appIcon = require('../../../assets/image.png');

const MEAL_MESSAGE = {
  morning: 'Breakfast is served.',
  afternoon: 'Lunch is served.',
  evening: 'Dinner is served.',
};

const greeting = (time: Date) => {
  const hour = Math.floor(toCentralTime(time).time / 100);
  if (hour < 12) return 'Good Morning! ☀️';
  if (hour < 18) return 'Good Afternoon! 🌤️';
  return 'Good Evening! 🌙';
};

const QuickLink = ({
  title,
  icon,
  href,
  theme,
}: {
  title: string;
  icon: React.ReactNode;
  href: '/favorites' | '/meal-plan';
  theme: Theme;
}) => (
  <View
    className="flex-1 overflow-hidden"
    style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
  >
    <Pressable accessibilityRole="button" onPress={() => router.push(href)}>
      {({ pressed }) => (
        <View
          className="flex-row items-center gap-x-2.5 px-4 py-3.5"
          style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}
        >
          {icon}
          <Text variant="subheadline" emphasized>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  </View>
);

const TypeChip = ({
  title,
  selected,
  onPress,
  theme,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  theme: Theme;
}) => (
  <PressableScale
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={() => {
      if (!selected) haptics.selection();
      onPress();
    }}
    className="h-[34px] justify-center rounded-full px-3.5"
    style={{ backgroundColor: selected ? theme.tint : theme.fill }}
  >
    <Text variant="subheadline" emphasized tone={selected ? 'onTint' : 'primary'}>
      {title}
    </Text>
  </PressableScale>
);

const LocationRow = memo(
  ({
    location,
    isOpen,
    subtitle,
    closingInMinutes,
    isFirst,
  }: LocationEntry & { isFirst: boolean }) => {
    const theme = useTheme();
    const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
    const name = location.name ?? '';
    return (
      <Link
        href={{
          pathname: location.has_menus ? '/location/[location]' : '/location_generic/[location]',
          params: { location: name },
        }}
        asChild
      >
        <Link.Trigger withAppleZoom>
          <GroupedRow
            accessibilityRole="button"
            isFirst={isFirst}
            separatorInset={37}
            leading={<StatusDot open={isOpen} closesInMinutes={closingInMinutes} />}
            title={displayLocationName(location, useColloquialNames)}
            titleColor={isOpen ? theme.label : theme.secondaryLabel}
            subtitle={subtitle}
            showChevron
          />
        </Link.Trigger>
      </Link>
    );
  },
);

const LocationRows = ({ entries }: { entries: LocationEntry[] }) =>
  entries.map((entry, index) => (
    <LocationRow key={entry.location.id} {...entry} isFirst={index === 0} />
  ));

const CenteredMessage = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.background }}
    >
      {children}
    </View>
  );
};

export default function Home() {
  const currentTime = useNow();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>({ kind: 'idle' });
  const { top: safeTop } = useSafeAreaInsets();
  const pull = useSharedValue(0);
  const dragging = useSharedValue(false);
  const refreshInFlight = useRef(false);
  const isOnboardingComplete = useOnboardingStore((state) => state.isOnboardingComplete);
  const theme = useTheme();

  const db = useSQLiteContext();
  const drizzleDb: DrizzleDB = drizzle(db, { schema });
  const queryClient = useQueryClient();

  useDrizzleStudio(db);

  const menuData = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(drizzleDb),
    staleTime: Infinity,
    retry: false,
  });
  const { data } = menuData;
  const menuSync = useMenuSync();
  const locations = data?.locations || [];
  const locationTypes = data?.locationTypes || [];
  const view = homeView({
    cache: menuData.status,
    locationCount: locations.length,
    sync: toSyncStatus(menuSync),
  });
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);

  const syncNow = async (): Promise<RefreshResult> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        haptics.error();
        return 'offline';
      }

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      await Promise.race([forceMenuSync(queryClient), timeoutPromise]);
      return 'updated';
    } catch (error) {
      log.warn('Error refreshing data', { error });
      haptics.error();
      return 'failed';
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleRefresh = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshStatus({ kind: 'refreshing' });
    const result = await syncNow();
    refreshInFlight.current = false;
    setRefreshStatus({ kind: 'settled', result, at: Date.now() });
  };

  const finishRefresh = useCallback(() => setRefreshStatus({ kind: 'idle' }), []);
  const tapAtTrigger = useCallback(() => haptics.tap(), []);
  const refreshOnRelease = () => void handleRefresh();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      pull.value = Math.max(0, -event.contentOffset.y - safeTop);
    },
    onBeginDrag: () => {
      dragging.value = true;
    },
    onEndDrag: () => {
      dragging.value = false;
      if (pull.value >= PULL_TRIGGER) runOnJS(refreshOnRelease)();
    },
  });

  useAnimatedReaction(
    () => dragging.value && pull.value >= PULL_TRIGGER,
    (armed, wasArmed) => {
      if (armed && wasArmed === false) runOnJS(tapAtTrigger)();
    },
  );

  const cacheLoading = view.kind === 'loading';
  useEffect(() => {
    if (cacheLoading) return;
    requestAnimationFrame(() => SplashScreen.hide());
  }, [cacheLoading]);

  if (view.kind === 'loading') {
    return (
      <CenteredMessage>
        <ActivityIndicator size="small" />
      </CenteredMessage>
    );
  }

  if (view.kind === 'cache-error') {
    return (
      <CenteredMessage>
        <Text variant="title3">Failed to load data!</Text>
        <Text variant="subheadline" tone="secondary" className="mb-4 max-w-64 text-center">
          If you just updated the app, close and reopen the app.
        </Text>
        <TouchableOpacity
          onPress={() => void syncNow()}
          className="rounded-full px-4 py-2"
          style={{ backgroundColor: theme.tint }}
        >
          <Text variant="subheadline" emphasized tone="onTint">
            Reload
          </Text>
        </TouchableOpacity>
      </CenteredMessage>
    );
  }

  const { open, closed } = sortLocationsByStatus(
    locations,
    locationTypes,
    selectedFilter,
    drizzleDb,
    currentTime,
  );
  const filters = [
    { id: 'all', title: 'All' },
    ...[...locationTypes]
      .sort((a, b) => a.display_order - b.display_order)
      .map((type) => ({ id: type.name, title: type.name })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Home', headerShown: false }} />
      <OnboardingScreen isOnboardingComplete={isOnboardingComplete} />

      {view.kind === 'first-sync' ? (
        <CenteredMessage>
          <ActivityIndicator size="small" />
        </CenteredMessage>
      ) : view.kind === 'first-sync-failed' ? (
        <CenteredMessage>
          <Text variant="title3" className="mb-1">
            Can't load menus yet
          </Text>
          <Text variant="subheadline" tone="secondary" className="mb-4 text-center">
            UT Dining needs a connection the first time you open it.
          </Text>
          <TouchableOpacity
            onPress={() => menuSync.refetch()}
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: theme.tint }}
          >
            <Text variant="subheadline" emphasized tone="onTint">
              Try again
            </Text>
          </TouchableOpacity>
        </CenteredMessage>
      ) : (
        <Reanimated.ScrollView
          testID="home-scroll"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshStatus.kind === 'refreshing'}
              onRefresh={handleRefresh}
              tintColor="transparent"
            />
          }
        >
          <Image
            source={appIcon}
            accessibilityLabel="UT Dining"
            className="mx-4 mb-4 size-12"
            contentFit="contain"
          />
          <Text variant="largeTitle" accessibilityRole="header" className="mx-5">
            {greeting(currentTime)}
          </Text>
          <Text variant="subheadline" tone="secondary" className="mx-5 mb-4">
            {MEAL_MESSAGE[timeOfDay(currentTime)]}
            {view.syncProblem &&
              ` · ${view.syncProblem === 'failed' ? "Couldn't update" : 'Offline'}${
                lastSyncedAt !== null
                  ? `, menus from ${formatTimeSinceSync(Date.now() - lastSyncedAt).toLowerCase()}`
                  : ''
              }`}
          </Text>

          <ServiceStatusBanner />

          <View className="mx-4 mb-3 flex-row gap-x-2">
            <QuickLink
              title="Favorites"
              href="/favorites"
              theme={theme}
              icon={<Heart size={20} color={theme.tint} fill={theme.tint} />}
            />
            <QuickLink
              title="Meal Plan"
              href="/meal-plan"
              theme={theme}
              icon={<MealPlanIcon size={20} color={theme.tint} filled />}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-x-2 px-4 pb-4"
          >
            {filters.map((filter) => (
              <TypeChip
                key={filter.id}
                title={filter.title}
                selected={selectedFilter === filter.id}
                onPress={() => setSelectedFilter(filter.id)}
                theme={theme}
              />
            ))}
          </ScrollView>

          {open.length > 0 && (
            <GroupedSection header="Open now">
              <LocationRows entries={open} />
            </GroupedSection>
          )}
          {closed.length > 0 && (
            <GroupedSection header="Closed">
              <LocationRows entries={closed} />
            </GroupedSection>
          )}
        </Reanimated.ScrollView>
      )}
      {view.kind === 'ready' && (
        <RefreshDrop pull={pull} status={refreshStatus} onFinished={finishRefresh} />
      )}
    </View>
  );
}
