import { describe, expect, it } from 'vitest';

import { canClearOverride, favoriteKey, shownFavorite } from './favoriteOverride';

describe('shownFavorite', () => {
  it('shows the pending value over the saved one', () => {
    expect(shownFavorite(false, { value: true, status: 'writing', seq: 1 })).toBe(true);
    expect(shownFavorite(true, { value: false, status: 'written', seq: 1 })).toBe(false);
  });

  it('shows the saved value without a pending change', () => {
    expect(shownFavorite(true, undefined)).toBe(true);
  });
});

describe('canClearOverride', () => {
  it('waits until the write finished and the cache shows it', () => {
    expect(canClearOverride({ value: true, status: 'writing', seq: 1 }, true)).toBe(false);
    expect(canClearOverride({ value: true, status: 'written', seq: 1 }, false)).toBe(false);
    expect(canClearOverride({ value: true, status: 'written', seq: 1 }, true)).toBe(true);
    expect(canClearOverride(undefined, true)).toBe(false);
  });
});

describe('favoriteKey', () => {
  it('keeps the same food at two places apart', () => {
    expect(favoriteKey('Pizza', 'J2 Dining')).not.toBe(favoriteKey('Pizza', 'JCL Dining'));
  });
});
