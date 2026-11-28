import { describe, expect, it } from 'vitest';
import { favoritesView } from './favoritesView';

describe('favoritesView', () => {
  it('is loading before the first query result, even with no rows', () => {
    expect(favoritesView(undefined, 0)).toBe('loading');
  });

  it('is empty only once the query has loaded with no rows', () => {
    expect(favoritesView(new Date(0), 0)).toBe('empty');
  });

  it('lists favorites once loaded', () => {
    expect(favoritesView(new Date(0), 3)).toBe('list');
  });
});
