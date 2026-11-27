import * as Application from 'expo-application';
import * as Network from 'expo-network';
import * as StoreReview from 'expo-store-review';
import { AppState } from 'react-native';

import { analytics } from '~/services/analytics/posthog';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { useOnboardingStore } from '~/store/useOnboardingStore';
import { log } from '~/utils/log';
import {
  decideRatingPrompt,
  RATING_PROMPT_DELAY_MS,
  type RatingTrigger,
} from '~/utils/ratingPrompt';

export const currentAppVersion = () => Application.nativeApplicationVersion ?? 'unknown';

const isOnline = async () => {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch (error) {
    log.warn('Could not read network state for the rating prompt', { error: String(error) });
    return false;
  }
};

const canShowRatingPrompt = async () => {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable && StoreReview.hasAction) return await StoreReview.hasAction();
    return isAvailable;
  } catch (error) {
    log.error('Error checking rating prompt availability', error);
    return false;
  }
};

let scheduled: { trigger: RatingTrigger; timer: ReturnType<typeof setTimeout> } | null = null;

const showIfDue = async (trigger: RatingTrigger) => {
  if (AppState.currentState !== 'active') return;
  const appVersion = currentAppVersion();
  const launches = useAppLaunchStore.getState();
  const decision = decideRatingPrompt({
    history: launches,
    appVersion,
    isOnboardingComplete: useOnboardingStore.getState().isOnboardingComplete,
    isOnline: await isOnline(),
    now: Date.now(),
  });
  if (decision.kind === 'skip') {
    log.debug('Rating prompt skipped', { trigger, reason: decision.reason });
    return;
  }
  launches.markRatingPromptShown(appVersion);
  if (!(await canShowRatingPrompt())) {
    log.debug('Rating prompt not available on this device');
    return;
  }
  analytics.capture('rating_prompt_requested', {
    trigger,
    app_version: appVersion,
    launch_count: launches.launchCount,
  });
  await StoreReview.requestReview();
};

export const ratingService = {
  requestAfterHappyMoment: (trigger: RatingTrigger) => {
    if (scheduled !== null) return;
    const timer = setTimeout(() => {
      scheduled = null;
      showIfDue(trigger).catch((error: unknown) => {
        log.error('Error showing rating prompt', error);
      });
    }, RATING_PROMPT_DELAY_MS);
    scheduled = { trigger, timer };
  },
  cancelPending: (trigger: RatingTrigger) => {
    if (scheduled?.trigger !== trigger) return;
    clearTimeout(scheduled.timer);
    scheduled = null;
  },
};
