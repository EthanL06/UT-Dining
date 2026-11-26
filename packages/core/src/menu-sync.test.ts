import { describe, expect, it } from 'vitest';
import { flattenMenuTree, getMenuDayVersions, planMenuDays } from './menu-sync.ts';

describe('getMenuDayVersions', () => {
  it('gives one version per day that does not depend on row order', () => {
    const a = { id: 1, date: '2026-11-04', updated_at: 'x' };
    const b = { id: 2, date: '2026-11-04', updated_at: 'y' };
    const c = { id: 3, date: '2026-11-05', updated_at: 'z' };
    expect(getMenuDayVersions([a, b, c])).toEqual(getMenuDayVersions([c, b, a]));
    expect(Object.keys(getMenuDayVersions([a, b, c]))).toEqual(['2026-11-04', '2026-11-05']);
  });

  it('changes when a row changes', () => {
    const before = getMenuDayVersions([{ id: 1, date: 'd', updated_at: 'x' }]);
    const after = getMenuDayVersions([{ id: 1, date: 'd', updated_at: 'y' }]);
    expect(before).not.toEqual(after);
  });
});

describe('planMenuDays', () => {
  const today = '2026-11-04';
  const remote = { '2026-11-03': 'a', '2026-11-04': 'b', '2026-11-05': 'c', '2026-11-06': 'd' };
  const cachedDates = Object.keys(remote);

  it('fetches nothing when every day matches', () => {
    expect(planMenuDays({ remote, synced: remote, cachedDates, today, force: false })).toEqual({
      fetch: [],
      remove: [],
    });
  });

  it('fetches only the days that changed', () => {
    const synced = { ...remote, '2026-11-05': 'old' };
    expect(planMenuDays({ remote, synced, cachedDates, today, force: false }).fetch).toEqual([
      '2026-11-05',
    ]);
  });

  it('fetches today first, then later days, then past days', () => {
    expect(
      planMenuDays({ remote, synced: {}, cachedDates: [], today, force: false }).fetch,
    ).toEqual(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-03']);
  });

  it('fetches every day when forced', () => {
    expect(
      planMenuDays({ remote, synced: remote, cachedDates, today, force: true }).fetch,
    ).toHaveLength(4);
  });

  it('fetches a day the cache lost, even if its version is saved', () => {
    expect(
      planMenuDays({ remote, synced: remote, cachedDates: ['2026-11-03'], today, force: false })
        .fetch,
    ).toEqual(['2026-11-04', '2026-11-05', '2026-11-06']);
  });

  it('removes days the server no longer has', () => {
    const plan = planMenuDays({
      remote: { [today]: 'b' },
      synced: { [today]: 'b', '2026-10-01': 'x' },
      cachedDates: [today, '2026-09-01'],
      today,
      force: false,
    });
    expect(plan.remove.sort()).toEqual(['2026-09-01', '2026-10-01']);
  });
});

describe('flattenMenuTree', () => {
  const tree = [
    {
      id: 1,
      name: 'Lunch',
      menu_category: [
        {
          id: 10,
          menu_id: 1,
          food_item: [
            {
              id: 100,
              menu_category_id: 10,
              nutrition: { id: 7, calories: '5' },
              allergens: { id: 8, milk: true },
            },
            {
              id: 101,
              menu_category_id: 10,
              nutrition: { id: 7, calories: '5' },
              allergens: null,
            },
          ],
        },
      ],
    },
    { id: 2, name: 'Dinner', menu_category: null },
  ];

  it('returns flat rows without the nested fields', () => {
    const rows = flattenMenuTree(tree);
    expect(rows.menu).toEqual([
      { id: 1, name: 'Lunch' },
      { id: 2, name: 'Dinner' },
    ]);
    expect(rows.menu_category).toEqual([{ id: 10, menu_id: 1 }]);
    expect(rows.food_item).toEqual([
      { id: 100, menu_category_id: 10 },
      { id: 101, menu_category_id: 10 },
    ]);
    expect(rows.allergens).toEqual([{ id: 8, milk: true }]);
  });

  it('keeps one row for a nutrition record that two foods share', () => {
    expect(flattenMenuTree(tree).nutrition).toEqual([{ id: 7, calories: '5' }]);
  });
});
