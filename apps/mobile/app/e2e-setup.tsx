import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { SERVICE_STATUS_QUERY_KEY } from '~/hooks/useServiceStatus';

import { useNotificationsStore } from '~/store/useNotificationsStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { isDevVariant } from '~/utils/appVariant';
import { parseServiceStatus } from '~/utils/serviceStatus';

export default function E2ESetup() {
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const setVisibleSince = useNotificationsStore((state) => state.setVisibleSince);
  const queryClient = useQueryClient();
  const { theme, serviceStatus } = useLocalSearchParams<{
    theme?: string;
    serviceStatus?: string;
  }>();

  useEffect(() => {
    if (isDevVariant) {
      skipOnboarding();
      setVisibleSince(0);
      if (theme === 'dark' || theme === 'light') setDarkMode(theme === 'dark');
      const status = parseServiceStatus({ status: serviceStatus });
      if (status) queryClient.setQueryData(SERVICE_STATUS_QUERY_KEY, status);
    }
    router.replace('/');
  }, [skipOnboarding, setVisibleSince, setDarkMode, theme, serviceStatus, queryClient]);

  return null;
}
