import { useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { SERVICE_STATUS_QUERY_KEY } from '~/hooks/useServiceStatus';

import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { parseServiceStatus } from '~/utils/serviceStatus';

const isDevBuild = Application.applicationId === 'com.ethanl06.ut-dining.dev';

export default function E2ESetup() {
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const queryClient = useQueryClient();
  const { theme, serviceStatus } = useLocalSearchParams<{
    theme?: string;
    serviceStatus?: string;
  }>();

  useEffect(() => {
    if (isDevBuild) {
      skipOnboarding();
      if (theme === 'dark' || theme === 'light') setDarkMode(theme === 'dark');
      const status = parseServiceStatus({ status: serviceStatus });
      if (status) queryClient.setQueryData(SERVICE_STATUS_QUERY_KEY, status);
    }
    router.replace('/');
  }, [skipOnboarding, setDarkMode, theme, serviceStatus, queryClient]);

  return null;
}
