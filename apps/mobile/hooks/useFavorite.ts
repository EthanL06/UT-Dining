import { useEffect } from 'react';
import { useFavoriteOverridesStore } from '~/store/useFavoriteOverridesStore';
import { canClearOverride, favoriteKey, shownFavorite } from '~/utils/favoriteOverride';

export const useFavorite = (foodName: string, locationName: string, persisted: boolean) => {
  const key = favoriteKey(foodName, locationName);
  const override = useFavoriteOverridesStore((state) => state.overrides[key]);
  const clear = useFavoriteOverridesStore((state) => state.clear);

  useEffect(() => {
    if (override && canClearOverride(override, persisted)) clear(key, override.seq);
  }, [override, persisted, clear, key]);

  return shownFavorite(persisted, override);
};
