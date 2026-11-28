export type FavoritesView = 'loading' | 'empty' | 'list';

export const favoritesView = (loadedAt: Date | undefined, count: number): FavoritesView => {
  if (loadedAt === undefined) return 'loading';
  return count === 0 ? 'empty' : 'list';
};
