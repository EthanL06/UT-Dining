import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { analytics } from '~/services/analytics/posthog';

export const usePostHogScreens = () => {
  const pathname = usePathname();

  useEffect(() => {
    analytics.screen(pathname);
  }, [pathname]);
};
