import * as Application from 'expo-application';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useOnboardingStore } from '~/store/useOnboardingStore';
import { useSettingsStore } from '~/store/useSettingsStore';

const isDevBuild = Application.applicationId === 'com.ethanl06.ut-dining.dev';

export default function E2ESetup() {
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);
  const setDarkMode = useSettingsStore((state) => state.setDarkMode);
  const { theme } = useLocalSearchParams<{ theme?: string }>();

  useEffect(() => {
    if (isDevBuild) {
      skipOnboarding();
      if (theme === 'dark' || theme === 'light') setDarkMode(theme === 'dark');
    }
    router.replace('/');
  }, [skipOnboarding, setDarkMode, theme]);

  return null;
}
