import { useEffect } from 'react';

import type { ListItem } from '~/hooks/useCategoryExpansion';
import type { Favorite } from '~/services/database/schema';
import { ratingService } from '~/services/rating/rating';
import { useAppLaunchStore } from '~/store/useAppLaunchStore';
import { menuViewTrigger } from '~/utils/ratingPrompt';

export const useRatingPromptOnMenuView = (
  menuReady: boolean,
  items: ListItem[],
  favorites: Favorite[],
) => {
  const launchCount = useAppLaunchStore((state) => state.launchCount);
  const firstLaunchTimestamp = useAppLaunchStore((state) => state.firstLaunchTimestamp);
  const trigger = menuReady
    ? menuViewTrigger({
        foodNames: items.flatMap((item) =>
          item.type === 'food_item' ? [item.data.name ?? null] : [],
        ),
        favoriteNames: favorites.map((favorite) => favorite.name),
        history: { launchCount, firstLaunchTimestamp, lastRatingPrompt: null },
        now: Date.now(),
      })
    : null;

  useEffect(() => {
    if (trigger === null) return;
    ratingService.requestAfterHappyMoment(trigger);
    return () => ratingService.cancelPending(trigger);
  }, [trigger]);
};
