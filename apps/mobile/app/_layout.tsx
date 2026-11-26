import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Stack } from 'expo-router';
import { openDatabaseSync, type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { PostHogProvider } from 'posthog-react-native';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, Appearance, AppState } from 'react-native';
import { SheetProvider } from 'react-native-actions-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NotifierWrapper } from 'react-native-notifier';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { useSyncQueries } from 'tanstack-query-dev-tools-expo-plugin';

import '../components/sheets/Sheets';

import migrations from '../drizzle/migrations';
import type * as schema from '../services/database/schema';

import '../global.css';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { VersionCheckProvider } from '~/components/VersionCheckProvider';
import { usePostHogScreens } from '~/hooks/usePostHogScreens';
import { POSTHOG_API_KEY, POSTHOG_CONFIG } from '~/services/analytics/posthog';
import { PushNotificationsInitializer } from '~/services/notifications/notifications';
import { ratingService } from '~/services/rating/rating';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { useSettingsStore } from '~/store/useSettingsStore';
export const DATABASE_NAME = 'database.db';

// This is the default configuration
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Reanimated runs in strict mode by default
});

const CONNECTION_PRAGMAS = 'PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;';

const expoDb = openDatabaseSync(DATABASE_NAME);
expoDb.execSync(CONNECTION_PRAGMAS);

const configureConnection = (database: SQLiteDatabase) => database.execAsync(CONNECTION_PRAGMAS);
const db = drizzle<typeof schema>(expoDb);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

onlineManager.setEventListener((setOnline) => {
  Network.getNetworkStateAsync().then((state) => setOnline(state.isConnected !== false));
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false);
  });
  return () => subscription.remove();
});

const AppContent = () => {
  const { success, error } = useMigrations(db, migrations);
  const { incrementLaunchCount } = useAppLaunchStore();
  useSyncQueries({ queryClient });
  usePostHogScreens();
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  useEffect(() => {
    Appearance.setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const isTablet = Device.deviceType === Device.DeviceType.TABLET;

  useEffect(() => {
    if (success) {
      console.log('✅ Database migrated successfully');

      // Increment launch count on successful app initialization
      incrementLaunchCount();

      // Check and show rating prompt if conditions are met
      ratingService.checkAndShowRatingPrompt();
    } else if (error) {
      console.error('❌ Error migrating database:', error);
    }
  }, [success, error, incrementLaunchCount]);

  if (!success && !error) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<ActivityIndicator size="small" />}>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={configureConnection}
          options={{ enableChangeListener: true }}
          useSuspense
        >
          <GestureHandlerRootView>
            <NotifierWrapper useRNScreensOverlay>
              <SheetProvider>
                <VersionCheckProvider>
                  <PushNotificationsInitializer />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: {
                        backgroundColor: 'white',
                      },
                      gestureEnabled: true,
                    }}
                  >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                    <Stack.Screen
                      name="location_generic/[location]"
                      options={{
                        presentation: isTablet ? 'card' : 'modal',
                        sheetGrabberVisible: true,
                        headerShown: false,
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen
                      name="food/[food]"
                      options={{
                        presentation: isTablet ? 'card' : 'modal',
                        sheetGrabberVisible: true,
                        headerShown: false,
                      }}
                    />

                    <Stack.Screen
                      name="favorites"
                      options={{
                        headerShown: false,
                        fullScreenGestureEnabled: false,
                      }}
                    />

                    <Stack.Screen
                      name="meal-plan"
                      options={{
                        headerShown: false,
                        fullScreenGestureEnabled: false,
                      }}
                    />
                    <Stack.Screen
                      name="location/[location]"
                      options={{
                        headerShown: false,
                        fullScreenGestureEnabled: false,
                      }}
                    />
                  </Stack>
                </VersionCheckProvider>
              </SheetProvider>
            </NotifierWrapper>
          </GestureHandlerRootView>
        </SQLiteProvider>
      </Suspense>
    </QueryClientProvider>
  );
};

export default function Layout() {
  // If no PostHog API key is provided, render app without PostHog
  if (!POSTHOG_API_KEY) {
    return <AppContent />;
  }

  // If PostHog API key is provided, wrap app with PostHog provider
  return (
    <PostHogProvider
      apiKey={POSTHOG_CONFIG.apiKey}
      options={POSTHOG_CONFIG.options}
      autocapture={POSTHOG_CONFIG.autocapture}
      debug={POSTHOG_CONFIG.debug}
    >
      <AppContent />
    </PostHogProvider>
  );
}
