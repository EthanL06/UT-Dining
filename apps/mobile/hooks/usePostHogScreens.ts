import { usePathname } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';

import { getSafePostHog } from '~/services/analytics/posthog';

export const usePostHogScreens = () => {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    getSafePostHog(posthog).screen(pathname);
  }, [pathname, posthog]);
};
