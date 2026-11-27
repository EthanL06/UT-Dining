import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { SERVICE_STATUS_QUERY_KEY } from '~/hooks/useServiceStatus';

import { setLocalAdminSession } from '~/services/admin/session';
import { currentAppVersion } from '~/services/rating/rating';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { useNotificationsStore } from '~/store/useNotificationsStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { isDevVariant } from '~/utils/appVariant';
import { describeBackend } from '~/utils/backend';
import { log } from '~/utils/log';
import { parseServiceStatus } from '~/utils/serviceStatus';

export default function E2ESetup() {
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const markRatingPromptShown = useAppLaunchStore((state) => state.markRatingPromptShown);
  const setVisibleSince = useNotificationsStore((state) => state.setVisibleSince);
  const queryClient = useQueryClient();
  const { theme, serviceStatus, adminAccessToken, adminRefreshToken } = useLocalSearchParams<{
    theme?: string;
    serviceStatus?: string;
    adminAccessToken?: string;
    adminRefreshToken?: string;
  }>();

  useEffect(() => {
    if (isDevVariant) {
      skipOnboarding();
      markRatingPromptShown(currentAppVersion());
      setVisibleSince(0);
      if (theme === 'dark' || theme === 'light') setDarkMode(theme === 'dark');
      const status = parseServiceStatus({ status: serviceStatus });
      if (status) queryClient.setQueryData(SERVICE_STATUS_QUERY_KEY, status);
      const isLocal = describeBackend(process.env.EXPO_PUBLIC_SUPABASE_URL).kind === 'local';
      if (isLocal && adminAccessToken && adminRefreshToken) {
        setLocalAdminSession(adminAccessToken, adminRefreshToken).catch((error: unknown) =>
          log.warn(`Local admin session failed: ${String(error)}`),
        );
      }
    }
    router.replace('/');
  }, [
    skipOnboarding,
    setVisibleSince,
    setDarkMode,
    markRatingPromptShown,
    theme,
    serviceStatus,
    adminAccessToken,
    adminRefreshToken,
    queryClient,
  ]);

  return null;
}
