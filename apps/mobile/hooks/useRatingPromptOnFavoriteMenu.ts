import { useEffect, useMemo } from 'react';

import type { ListItem } from '~/hooks/useCategoryExpansion';
import type { Favorite } from '~/services/database/schema';
import { ratingService } from '~/services/rating/rating';
import { menuHasFavorite } from '~/utils/ratingPrompt';

export const useRatingPromptOnFavoriteMenu = (
  menuReady: boolean,
  items: ListItem[],
  favorites: Favorite[],
) => {
  const hasFavorite = useMemo(
    () =>
      menuHasFavorite(
        items.flatMap((item) => (item.type === 'food_item' ? [item.data.name ?? null] : [])),
        favorites.map((favorite) => favorite.name),
      ),
    [items, favorites],
  );
  const shouldAsk = menuReady && hasFavorite;

  useEffect(() => {
    if (!shouldAsk) return;
    ratingService.requestAfterHappyMoment('favorite_on_menu');
    return () => ratingService.cancelPending('favorite_on_menu');
  }, [shouldAsk]);
};
