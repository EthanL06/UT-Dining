import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { ChefHat, Heart } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Notifier } from 'react-native-notifier';
import Alert from '~/components/Alert';
import type { FilterType } from '~/components/FilterBar';
import OnboardingScreen from '~/components/onboarding/OnboardingScreen';
import { GroupedRow, GroupedSection, StatusDot } from '~/components/ui/Grouped';
import { forceMenuSync, useMenuSync } from '~/hooks/useMenuSync';
import type { DrizzleDB } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { getLocationName } from '~/utils/locations';
import { readCachedMenuData } from '~/utils/queries';
import { type Theme, useTheme } from '~/utils/theme';
import { formatTimeSinceSync, getLocationStatusText, timeOfDay } from '~/utils/time';
import * as schema from '../../../services/database/schema';

const SPLASH_SCREEN_DURATION = 200;
const NOTIFICATION_DURATION = 3000;

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: SPLASH_SCREEN_DURATION,
  fade: true,
});

type LocationEntry = { location: schema.LocationWithType; isOpen: boolean };

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
  const items: LocationEntry[] = filteredLocations.map((location) => ({
    location,
    isOpen: isLocationOpenNow(location, locationIdsWithMenus, currentTime),
  }));

  return {
    open: items.filter((item) => item.isOpen),
    closed: items.filter((item) => !item.isOpen),
  };
};

const MEAL_MESSAGE = {
  morning: 'Breakfast is served',
  afternoon: 'Lunch is served',
  evening: 'Dinner is served',
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
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(href);
      }}
    >
      {({ pressed }) => (
        <View
          className="flex-row items-center gap-x-2.5 px-4 py-3.5"
          style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}
        >
          {icon}
          <Text className="font-semibold text-[15px]" style={{ color: theme.label }}>
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
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
    className="h-[34px] justify-center rounded-full px-3.5"
    style={{ backgroundColor: selected ? theme.tint : theme.fill }}
  >
    <Text
      className={selected ? 'font-semibold text-[14px]' : 'font-medium text-[14px]'}
      style={{ color: selected ? '#FFFFFF' : theme.label }}
    >
      {title}
    </Text>
  </Pressable>
);

const LocationRows = ({
  entries,
  currentTime,
  db,
}: {
  entries: LocationEntry[];
  currentTime: Date;
  db: DrizzleDB;
}) => {
  const theme = useTheme();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);

  return entries.map(({ location, isOpen }, index) => {
    const name = location.name ?? '';
    return (
      <GroupedRow
        key={location.id}
        isFirst={index === 0}
        separatorInset={37}
        leading={<StatusDot open={isOpen} />}
        title={getLocationName(db, name, useColloquialNames)}
        titleColor={isOpen ? theme.label : theme.secondaryLabel}
        subtitle={getLocationStatusText(location, isOpen, currentTime)}
        showChevron
        onPress={() =>
          router.push(location.has_menus ? `/location/${name}` : `/location_generic/${name}`)
        }
      />
    );
  });
};

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const isOnboardingComplete = useOnboardingStore((state) => state.isOnboardingComplete);
  const theme = useTheme();

  const db = useSQLiteContext();
  const drizzleDb: DrizzleDB = drizzle(db, { schema });
  const queryClient = useQueryClient();

  useDrizzleStudio(db);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(drizzleDb),
    staleTime: Infinity,
    retry: false,
  });
  const menuSync = useMenuSync(drizzleDb);
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);

  const handleRefresh = async () => {
    setRefreshing(true);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        Notifier.showNotification({
          title: 'No Internet Connection',
          description: 'Please check your connection and try again.',
          duration: NOTIFICATION_DURATION,
          Component: Alert,
        });
        return;
      }

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      await Promise.race([forceMenuSync(drizzleDb, queryClient), timeoutPromise]);

      Notifier.showNotification({
        title: 'Refreshed!',
        description: 'Menu data is up to date.',
        duration: NOTIFICATION_DURATION,
        Component: Alert,
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      const errorMessage =
        error instanceof Error && error.message === 'Request timeout'
          ? 'Request timed out. Please try again.'
          : 'Unable to update data. Please try again.';

      Notifier.showNotification({
        title: 'Refresh Failed',
        description: errorMessage,
        duration: NOTIFICATION_DURATION,
        Component: Alert,
      });
    } finally {
      clearTimeout(timeoutId);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;
    requestAnimationFrame(() => SplashScreen.hide());
  }, [isLoading]);

  if (isLoading) {
    return (
      <CenteredMessage>
        <ActivityIndicator size="small" />
      </CenteredMessage>
    );
  }

  if (isError) {
    return (
      <CenteredMessage>
        <Text className="font-bold text-lg" style={{ color: theme.label }}>
          Failed to load data!
        </Text>
        <Text className="mb-4 max-w-64 text-center" style={{ color: theme.secondaryLabel }}>
          If you just updated the app, close and reopen the app.
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          className="rounded-full px-4 py-2"
          style={{ backgroundColor: theme.tint }}
        >
          <Text className="font-bold text-white">Reload</Text>
        </TouchableOpacity>
      </CenteredMessage>
    );
  }

  const locations = data?.locations || [];
  const locationTypes = data?.locationTypes || [];
  const syncUnavailable = menuSync.isError || menuSync.fetchStatus === 'paused';
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
      <Stack.Screen options={{ title: 'Dining' }} />
      <OnboardingScreen isOnboardingComplete={isOnboardingComplete} />

      {locations.length === 0 && menuSync.isFetching ? (
        <CenteredMessage>
          <ActivityIndicator size="small" />
        </CenteredMessage>
      ) : locations.length === 0 && syncUnavailable ? (
        <CenteredMessage>
          <Text className="mb-1 font-bold text-lg" style={{ color: theme.label }}>
            Can't load menus yet
          </Text>
          <Text className="mb-4 text-center" style={{ color: theme.secondaryLabel }}>
            UT Dining needs a connection the first time you open it.
          </Text>
          <TouchableOpacity
            onPress={() => menuSync.refetch()}
            className="rounded-full px-4 py-2"
            style={{ backgroundColor: theme.tint }}
          >
            <Text className="font-bold text-white">Try again</Text>
          </TouchableOpacity>
        </CenteredMessage>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.secondaryLabel}
            />
          }
        >
          <Text className="mx-5 mb-3 text-[15px]" style={{ color: theme.secondaryLabel }}>
            {MEAL_MESSAGE[timeOfDay(currentTime)]}
            {syncUnavailable &&
              ` · ${onlineManager.isOnline() ? "Couldn't update" : 'Offline'}${
                lastSyncedAt !== null
                  ? `, menus from ${formatTimeSinceSync(Date.now() - lastSyncedAt).toLowerCase()}`
                  : ''
              }`}
          </Text>

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
              icon={<ChefHat size={20} color={theme.tint} />}
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
              <LocationRows entries={open} currentTime={currentTime} db={drizzleDb} />
            </GroupedSection>
          )}
          {closed.length > 0 && (
            <GroupedSection header="Closed">
              <LocationRows entries={closed} currentTime={currentTime} db={drizzleDb} />
            </GroupedSection>
          )}
        </ScrollView>
      )}
    </View>
  );
}
