import { PostHog } from 'posthog-react-native';

type PostHogEventProperties = Parameters<PostHog['capture']>[1];

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const IS_DEV = __DEV__;

export const POSTHOG_CONFIG = {
  apiKey: POSTHOG_API_KEY,
  options: {
    host: 'https://us.i.posthog.com',
    enableSessionReplay: false,
    disabled: IS_DEV,
    errorTracking: {
      autocapture: {
        uncaughtExceptions: true,
        unhandledRejections: true,
      },
    },
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

export const posthogClient = POSTHOG_API_KEY
  ? new PostHog(POSTHOG_API_KEY, POSTHOG_CONFIG.options)
  : undefined;
