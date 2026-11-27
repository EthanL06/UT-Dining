import type { PostHog } from 'posthog-react-native';

type PostHogEventProperties = Parameters<PostHog['capture']>[1];

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const IS_DEV = __DEV__;

export const POSTHOG_CONFIG = {
  apiKey: POSTHOG_API_KEY,
  options: {
    host: 'https://us.i.posthog.com',
    enableSessionReplay: true,
    disabled: IS_DEV,
  },
  autocapture: {
    captureScreens: false,
    captureTouches: true,
    customLabelProp: 'ph-label',
  },
  debug: false,
} as const;

export function getSafePostHog(posthog: PostHog | undefined) {
  return {
    screen: (name?: string, properties?: PostHogEventProperties) => {
      if (posthog && name) {
        posthog.screen(name, properties);
      }
    },
    capture: (eventName: string, properties?: PostHogEventProperties) => {
      if (posthog) {
        posthog.capture(eventName, properties);
      }
    },
    track: (eventName: string, properties?: PostHogEventProperties) => {
      if (posthog) {
        posthog.capture(eventName, properties);
      }
    },
  };
}

if (!POSTHOG_API_KEY) {
  console.warn(
    '⚠️ PostHog analytics are disabled. To enable analytics, add EXPO_PUBLIC_POSTHOG_API_KEY to your environment variables. See README.md for more information.',
  );
} else if (POSTHOG_CONFIG.options.disabled) {
  console.log(
    'ℹ️  PostHog analytics disabled in development mode. To enable analytics in development, set `disabled: false` in POSTHOG_CONFIG options.',
  );
} else if (!POSTHOG_CONFIG.debug) {
  console.log('✅ PostHog analytics enabled (debug disabled)');
} else {
  console.log('✅ PostHog analytics enabled (debug enabled)');
}
