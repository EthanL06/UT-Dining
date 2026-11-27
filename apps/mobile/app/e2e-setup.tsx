import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { FRAME_MONITOR_KEY } from '~/components/qa/FrameMonitor';
import { SERVICE_STATUS_QUERY_KEY } from '~/hooks/useServiceStatus';
import { currentAppVersion } from '~/services/rating/rating';
import { miscStorage } from '~/store/misc-storage';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { useNotificationsStore } from '~/store/useNotificationsStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { isDevVariant } from '~/utils/appVariant';
import { parseServiceStatus } from '~/utils/serviceStatus';

export default function E2ESetup() {
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const markRatingPromptShown = useAppLaunchStore((state) => state.markRatingPromptShown);
  const setVisibleSince = useNotificationsStore((state) => state.setVisibleSince);
  const queryClient = useQueryClient();
  const { theme, serviceStatus, frames } = useLocalSearchParams<{
    theme?: string;
    serviceStatus?: string;
    frames?: string;
  }>();

  useEffect(() => {
    if (isDevVariant) {
      skipOnboarding();
      markRatingPromptShown(currentAppVersion());
      setVisibleSince(0);
      if (theme === 'dark' || theme === 'light') setDarkMode(theme === 'dark');
      const status = parseServiceStatus({ status: serviceStatus });
      if (status) queryClient.setQueryData(SERVICE_STATUS_QUERY_KEY, status);
      if (frames === 'on' || frames === 'off') miscStorage.set(FRAME_MONITOR_KEY, frames === 'on');
    }
    router.replace('/');
  }, [
    skipOnboarding,
    setVisibleSince,
    setDarkMode,
    markRatingPromptShown,
    theme,
    serviceStatus,
    frames,
    queryClient,
  ]);

  return null;
}
