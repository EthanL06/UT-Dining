import { describe, expect, it } from 'vitest';

import { menuEmptyState } from './menuList';

const base = { menu: 'ready' as const, syncing: false, searching: false, filtering: false };

describe('menuEmptyState', () => {
  it('shows the skeleton while the menu loads and a spinner while syncing', () => {
    expect(menuEmptyState({ ...base, menu: 'loading', syncing: true })).toEqual({
      kind: 'skeleton',
    });
    expect(menuEmptyState({ ...base, syncing: true })).toEqual({ kind: 'syncing' });
  });

  it('explains an error before an empty result', () => {
    expect(menuEmptyState({ ...base, menu: 'error', searching: true })).toMatchObject({
      title: 'Error Loading Menu',
    });
  });

  it('points at the search, then the filters', () => {
    expect(menuEmptyState({ ...base, searching: true, filtering: true })).toMatchObject({
      subtitle: 'Try a different search term.',
    });
    expect(menuEmptyState({ ...base, filtering: true })).toMatchObject({
      subtitle: 'Try adjusting your filters.',
    });
    expect(menuEmptyState(base)).toMatchObject({ subtitle: 'Please try again later.' });
  });
});
