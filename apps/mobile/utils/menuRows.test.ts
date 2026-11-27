import { describe, expect, it } from 'vitest';
import type { FoodItem } from '~/services/database/types';
import { buildMenuRows, foodMatcher, type RowCache, toMenuSource } from './menuRows';

const food = (name: string): FoodItem => ({ name, link: null });

const source = toMenuSource([
  { category_title: 'Entrees', food_items: [food('Pasta'), food('Pizza'), food('Tacos')] },
  { category_title: 'Sides', food_items: [food('Rice')] },
]);

const summary = (rows: ReturnType<typeof buildMenuRows>) =>
  rows.map((row) =>
    row.type === 'category_header'
      ? `# ${row.title}${row.isExpanded ? '' : ' (collapsed)'}`
      : `${row.data.name} ${row.position}`,
  );

describe('buildMenuRows', () => {
  it('lists every category with the position of each food', () => {
    expect(summary(buildMenuRows(source, { collapsed: new Set() }, new Map()))).toEqual([
      '# Entrees',
      'Pasta first',
      'Pizza middle',
      'Tacos last',
      '# Sides',
      'Rice single',
    ]);
  });

  it('leaves out the foods of a collapsed category but keeps its header', () => {
    expect(summary(buildMenuRows(source, { collapsed: new Set(['Entrees']) }, new Map()))).toEqual([
      '# Entrees (collapsed)',
      '# Sides',
      'Rice single',
    ]);
  });

  it('keeps only matching foods and drops categories with no match', () => {
    const matches = (item: FoodItem) => (item.name ?? '').startsWith('P');
    expect(summary(buildMenuRows(source, { collapsed: new Set(), matches }, new Map()))).toEqual([
      '# Entrees',
      'Pasta first',
      'Pizza last',
    ]);
  });

  it('reuses unchanged row objects so memoized rows do not re-render', () => {
    const cache: RowCache = new Map();
    const before = buildMenuRows(source, { collapsed: new Set() }, cache);
    const after = buildMenuRows(source, { collapsed: new Set(['Sides']) }, cache);
    expect(after[1]).toBe(before[1]);
    expect(after[3]).toBe(before[3]);
    expect(after[4]).not.toBe(before[4]);
  });

  it('makes a new row only when its position changes', () => {
    const cache: RowCache = new Map();
    const before = buildMenuRows(source, { collapsed: new Set() }, cache);
    const after = buildMenuRows(
      source,
      { collapsed: new Set(), matches: (item) => item.name !== 'Pasta' },
      cache,
    );
    const pizzaBefore = before.find((row) => row.type === 'food_item' && row.data.name === 'Pizza');
    const pizzaAfter = after.find((row) => row.type === 'food_item' && row.data.name === 'Pizza');
    const riceBefore = before.find((row) => row.type === 'food_item' && row.data.name === 'Rice');
    const riceAfter = after.find((row) => row.type === 'food_item' && row.data.name === 'Rice');
    expect(pizzaAfter).not.toBe(pizzaBefore);
    expect(riceAfter).toBe(riceBefore);
  });
});

describe('foodMatcher', () => {
  const noFilters = {
    favorites: false,
    mealPlan: false,
    allergens: {},
    dietary: {},
  } as unknown as Parameters<typeof foodMatcher>[0]['filters'];

  it('matches everything with no query and no filters', () => {
    expect(
      foodMatcher({ query: ' ', filters: noFilters, favorites: [], isInMealPlan: () => false }),
    ).toBeUndefined();
  });

  it('matches a trimmed query anywhere in the name, ignoring case', () => {
    const matches = foodMatcher({
      query: ' PIZ ',
      filters: noFilters,
      favorites: [],
      isInMealPlan: () => false,
    });
    expect(matches?.(food('Cheese Pizza'), 'Entrees')).toBe(true);
    expect(matches?.(food('Pasta'), 'Entrees')).toBe(false);
  });

  it('applies the meal plan filter with the food category', () => {
    const matches = foodMatcher({
      query: '',
      filters: { ...noFilters, mealPlan: true },
      favorites: [],
      isInMealPlan: (item, category) => item.name === 'Rice' && category === 'Sides',
    });
    expect(matches?.(food('Rice'), 'Sides')).toBe(true);
    expect(matches?.(food('Rice'), 'Entrees')).toBe(false);
  });
});
