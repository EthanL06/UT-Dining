import * as StoreReview from 'expo-store-review';

import { useAppLaunchStore } from '~/store/useAppLaunchStore';

export interface RatingService {
  checkAndShowRatingPrompt: () => Promise<void>;
  canShowRatingPrompt: () => Promise<boolean>;
}

class RatingServiceImpl implements RatingService {
  async checkAndShowRatingPrompt(): Promise<void> {
    try {
      const { shouldShowRatingPrompt, markRatingPromptShown } = useAppLaunchStore.getState();

      if (!shouldShowRatingPrompt()) {
        return;
      }

      const canShow = await this.canShowRatingPrompt();
      if (!canShow) {
        console.log('📱 Rating prompt not available on this device');
        markRatingPromptShown();
        return;
      }

      console.log('⭐ Showing rating prompt');
      await StoreReview.requestReview();

      markRatingPromptShown();
    } catch (error) {
      console.error('❌ Error showing rating prompt:', error);
      useAppLaunchStore.getState().markRatingPromptShown();
    }
  }

  async canShowRatingPrompt(): Promise<boolean> {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();

      if (isAvailable && StoreReview.hasAction) {
        return await StoreReview.hasAction();
      }

      return isAvailable;
    } catch (error) {
      console.error('❌ Error checking rating prompt availability:', error);
      return false;
    }
  }
}

export const ratingService = new RatingServiceImpl();
