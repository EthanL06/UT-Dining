export type FavoriteOverride = {
  value: boolean;
  status: 'writing' | 'written';
  seq: number;
};

export const favoriteKey = (foodName: string, locationName: string) =>
  `${locationName}\u001f${foodName}`;

export const shownFavorite = (persisted: boolean, override: FavoriteOverride | undefined) =>
  override ? override.value : persisted;

export const canClearOverride = (override: FavoriteOverride | undefined, persisted: boolean) =>
  override !== undefined && override.status === 'written' && override.value === persisted;
