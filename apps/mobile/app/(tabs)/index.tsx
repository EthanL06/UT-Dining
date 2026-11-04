import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Notifier } from 'react-native-notifier';
import Alert from '~/components/Alert';
import { Container } from '~/components/Container';
import OnboardingScreen from '~/components/onboarding/OnboardingScreen';
import { forceMenuSync, useMenuSync } from '~/hooks/useMenuSync';
import type { DrizzleDB } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { getTodayInCentralTime } from '~/utils/date';
import { getLocationOpenStatus } from '~/utils/locationStatus';
import { readCachedMenuData } from '~/utils/queries';
import { formatTimeSinceSync } from '~/utils/time';
import { cn } from '~/utils/utils';
import * as schema from '../../services/database/schema';
import HomeHeader from '../_components/HomeHeader';
import LocationItem from '../_components/LocationItem';

// Constants
const SPLASH_SCREEN_DURATION = 1000;
const NOTIFICATION_DURATION = 3000;

// Configure splash screen
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: SPLASH_SCREEN_DURATION,
  fade: true,
});

// Types
export type FilterType = 'all' | string;

const filterAndSortLocations = (
  locations: schema.LocationWithType[],
  locationTypes: schema.LocationType[],
  filter: FilterType,
  db: DrizzleDB,
  currentTime: Date,
) => {
  // First filter by type
  let filteredLocations = locations;
  if (filter !== 'all') {
    const targetType = locationTypes.find((type) => type.name === filter);
    if (targetType) {
      filteredLocations = locations.filter((location) => location.type_id === targetType.id);
    }
  }

  // Then sort by open/closed status while maintaining original order within each group
  const openLocations: schema.LocationWithType[] = [];
  const closedLocations: schema.LocationWithType[] = [];

  // Get today's date for menu checking
  const todayDate = getTodayInCentralTime();

  filteredLocations.forEach((location) => {
    // Get location data for each location to determine if it's open
    const locationData = db
      .select()
      .from(schema.location)
      .where(eq(schema.location.id, location.id))
      .get();
    if (!locationData) {
      // count as closed, todo: log error
      closedLocations.push(location);
      return;
    }
    const isOpen = getLocationOpenStatus(location, locationData, db, currentTime, todayDate);

    if (isOpen) {
      openLocations.push(location);
    } else {
      closedLocations.push(location);
    }
  });

  // Return open locations first, then closed locations
  return [...openLocations, ...closedLocations];
};

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const isOnboardingComplete = useOnboardingStore((state) => state.isOnboardingComplete);

  const db = useSQLiteContext();
  const drizzleDb: DrizzleDB = drizzle(db, { schema });
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const queryClient = useQueryClient();

  useDrizzleStudio(db);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  // Use TanStack Query for menu/location data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(drizzleDb),
    staleTime: Infinity,
    retry: false,
  });
  const menuSync = useMenuSync(drizzleDb);
  const timeSinceSync = useDataSyncStore((state) => state.getTimeSinceLastSync());

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Check if user is online before attempting to refetch
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

      // Add timeout to refetch operation (10 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });

      // Force sync with Supabase and then refetch the query
      await Promise.race([forceMenuSync(drizzleDb, queryClient), timeoutPromise]);

      setRefreshKey((prev) => prev + 1);

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
      setRefreshing(false);
    }
  };

  // Handle splash screen
  const onLayoutRootView = () => {
    setLayoutLoaded(true);
  };

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDarkMode ? '#171717' : '#fff',
        }}
      >
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isDarkMode ? '#171717' : '#fff',
        }}
      >
        <Text
          className={cn('font-bold text-lg', isDarkMode ? 'text-white' : 'text-ut-burnt-orange')}
        >
          Failed to load data!
        </Text>

        <Text
          className={cn('mb-4 max-w-64 text-center', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}
        >
          If you just updated the app, close and reopen the app.
        </Text>

        <TouchableOpacity
          onPress={handleRefresh}
          className="rounded-full bg-ut-burnt-orange px-4 py-2"
        >
          <Text className="font-bold text-white">Reload</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const locations = data?.locations || [];
  const locationTypes = data?.locationTypes || [];
  const syncUnavailable = menuSync.isError || menuSync.fetchStatus === 'paused';

  const filteredLocations = filterAndSortLocations(
    locations,
    locationTypes,
    selectedFilter,
    drizzleDb,
    currentTime,
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDarkMode ? '#171717' : '#fff' }}>
      <Stack.Screen options={{ title: 'Home' }} />
      <Container className="pb-0" disableBottomPadding onLayout={onLayoutRootView}>
        <OnboardingScreen isOnboardingComplete={isOnboardingComplete} />

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center">
            <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>
              Failed to load data. Please try again.
            </Text>
          </View>
        ) : locations.length === 0 && menuSync.isFetching ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" />
          </View>
        ) : locations.length === 0 && syncUnavailable ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text
              className={cn('mb-1 font-bold text-lg', isDarkMode ? 'text-white' : 'text-ut-grey')}
            >
              Can't load menus yet
            </Text>
            <Text className={cn('mb-4 text-center', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}>
              UT Dining needs a connection the first time you open it.
            </Text>
            <TouchableOpacity
              onPress={() => menuSync.refetch()}
              className="rounded-full bg-ut-burnt-orange px-4 py-2"
            >
              <Text className="font-bold text-white">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            contentInsetAdjustmentBehavior="automatic"
            extraData={[currentTime, selectedFilter, refreshKey]}
            data={filteredLocations}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={isDarkMode ? COLORS['ut-grey-dark-mode'] : '#8E8E93'}
              />
            }
            contentContainerClassName="flex gap-y-3 pb-8"
            renderItem={({ item }) => {
              return (
                <LocationItem
                  key={`${item.id}-${refreshKey}`}
                  location={item}
                  currentTime={currentTime}
                />
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            numColumns={1}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                <HomeHeader
                  currentTime={currentTime}
                  selectedFilter={selectedFilter}
                  setSelectedFilter={setSelectedFilter}
                  locationTypes={locationTypes}
                />
                {syncUnavailable && (
                  <Text
                    className={cn('mt-3 text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-500')}
                  >
                    {onlineManager.isOnline() ? "Couldn't update" : 'Offline'}
                    {timeSinceSync !== Infinity &&
                      ` · menus updated ${formatTimeSinceSync(timeSinceSync).toLowerCase()}`}
                  </Text>
                )}
              </>
            }
          />
        )}
      </Container>
    </View>
  );
}
