import { describe, expect, it } from 'vitest';

import { type MultiSelect, toggleSelected } from './useMultiSelect';

describe('toggleSelected', () => {
  it('adds and removes ids while selecting', () => {
    const start: MultiSelect = { mode: 'selecting', ids: new Set(['a']) };
    const added = toggleSelected(start, 'b');
    expect(added).toEqual({ mode: 'selecting', ids: new Set(['a', 'b']) });
    expect(toggleSelected(added, 'a')).toEqual({ mode: 'selecting', ids: new Set(['b']) });
  });

  it('ignores toggles while browsing', () => {
    const browsing: MultiSelect = { mode: 'browsing' };
    expect(toggleSelected(browsing, 'a')).toBe(browsing);
  });
});
