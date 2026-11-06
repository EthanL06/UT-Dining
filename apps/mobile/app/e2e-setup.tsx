import * as Application from 'expo-application';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useOnboardingStore } from '~/store/useOnboardingStore';

const isDevBuild = Application.applicationId === 'com.ethanl06.ut-dining.dev';

export default function E2ESetup() {
  const skipOnboarding = useOnboardingStore((state) => state.skipOnboarding);

  useEffect(() => {
    if (isDevBuild) {
      skipOnboarding();
    }
    router.replace('/');
  }, [skipOnboarding]);

  return null;
}
