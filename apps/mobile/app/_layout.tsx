import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import { openDatabaseSync, type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { PostHogProvider } from 'posthog-react-native';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, Appearance, AppState } from 'react-native';
import { SheetProvider } from 'react-native-actions-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { useSyncQueries } from 'tanstack-query-dev-tools-expo-plugin';
import { log } from '~/utils/log';

import '../components/sheets/Sheets';

import migrations from '../drizzle/migrations';
import type * as schema from '../services/database/schema';

import '../global.css';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { AppErrorScreen, MIGRATION_ERROR_COPY } from '~/components/AppErrorScreen';
import { NearbyAlertsInitializer } from '~/components/nearby/NearbyAlertsInitializer';
import { VersionCheckProvider } from '~/components/VersionCheckProvider';
import { usePostHogScreens } from '~/hooks/usePostHogScreens';
import { POSTHOG_CONFIG, posthogClient } from '~/services/analytics/posthog';
import { PushNotificationsInitializer } from '~/services/notifications/notifications';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTheme } from '~/utils/theme';
export const DATABASE_NAME = 'database.db';

Appearance.setColorScheme(useSettingsStore.getState().isDarkMode ? 'dark' : 'light');

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
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
  Network.getNetworkStateAsync()
    .then((state) => setOnline(state.isConnected !== false))
    .catch((error) => log.warn('Network state read failed', { error }));
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
      incrementLaunchCount();
    }
  }, [success, incrementLaunchCount]);

  if (error) {
    return <AppErrorScreen {...MIGRATION_ERROR_COPY} error={error} source="sqlite-migration" />;
  }

  if (!success) return null;

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
            <SheetProvider>
              <VersionCheckProvider>
                <PushNotificationsInitializer />
                <NearbyAlertsInitializer />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: {
                      backgroundColor: getTheme(isDarkMode).background,
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
                    name="nearby"
                    options={{
                      presentation: isTablet ? 'card' : 'formSheet',
                      sheetGrabberVisible: true,
                      sheetAllowedDetents: 'fitToContents',
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
          </GestureHandlerRootView>
        </SQLiteProvider>
      </Suspense>
    </QueryClientProvider>
  );
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <AppErrorScreen
      title="Something went wrong"
      message="This screen hit an error. Try again, or restart the app if it keeps happening."
      error={error}
      source="router-error-boundary"
      onRetry={retry}
    />
  );
}

export default function Layout() {
  if (!posthogClient) {
    return <AppContent />;
  }

  return (
    <PostHogProvider
      client={posthogClient}
      autocapture={POSTHOG_CONFIG.autocapture}
      debug={POSTHOG_CONFIG.debug}
    >
      <AppContent />
    </PostHogProvider>
  );
}
