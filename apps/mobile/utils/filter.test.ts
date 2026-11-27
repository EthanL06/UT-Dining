import { describe, expect, it } from 'vitest';

import type { FoodItem } from '~/services/database/database';
import type * as schema from '~/services/database/schema';
import type { FiltersState } from '~/store/useFiltersStore';

import { filterFoodItems, foodFilter, hasActiveFilters } from './filter';

const item = (name: string, allergens: Record<string, boolean> = {}): FoodItem =>
  ({ name, link: '', allergens }) as unknown as FoodItem;

const noFilters: FiltersState['filters'] = {
  favorites: false,
  mealPlan: false,
  allergens: {},
  dietary: {},
};

const items = [
  item('Pancakes', { egg: true, vegetarian: true }),
  item('Tofu Bowl', { soy: true, vegan: true, vegetarian: true }),
  item('Brisket', { beef: true }),
];

const names = (result: FoodItem[]) => result.map((food) => food.name);

describe('filterFoodItems', () => {
  it('keeps every item with no filters on', () => {
    expect(names(filterFoodItems(items, noFilters, []))).toEqual([
      'Pancakes',
      'Tofu Bowl',
      'Brisket',
    ]);
  });

  it('keeps only favorites when the favorites filter is on', () => {
    const favorites = [{ name: 'Brisket' }] as schema.Favorite[];
    expect(names(filterFoodItems(items, { ...noFilters, favorites: true }, favorites))).toEqual([
      'Brisket',
    ]);
  });

  it('keeps only meal plan items when the meal plan filter is on', () => {
    const inPlan = (food: FoodItem) => food.name === 'Pancakes';
    expect(names(filterFoodItems(items, { ...noFilters, mealPlan: true }, [], inPlan))).toEqual([
      'Pancakes',
    ]);
  });

  it('drops items that contain any selected allergen', () => {
    const filters = { ...noFilters, allergens: { egg: true, beef: true, soy: false } };
    expect(names(filterFoodItems(items, filters, []))).toEqual(['Tofu Bowl']);
  });

  it('keeps only items that match every selected diet', () => {
    expect(
      names(filterFoodItems(items, { ...noFilters, dietary: { vegetarian: true } }, [])),
    ).toEqual(['Pancakes', 'Tofu Bowl']);
    expect(
      names(
        filterFoodItems(items, { ...noFilters, dietary: { vegetarian: true, vegan: true } }, []),
      ),
    ).toEqual(['Tofu Bowl']);
  });

  it('counts vegan items as vegetarian', () => {
    const salad = item('Salad Bar', { vegan: true });
    expect(
      names(
        filterFoodItems([...items, salad], { ...noFilters, dietary: { vegetarian: true } }, []),
      ),
    ).toEqual(['Pancakes', 'Tofu Bowl', 'Salad Bar']);
  });

  it('drops items with no allergen data when a diet is selected', () => {
    const bare = { name: 'Mystery', link: '' } as unknown as FoodItem;
    expect(filterFoodItems([bare], { ...noFilters, dietary: { vegan: true } }, [])).toEqual([]);
  });
});

describe('foodFilter', () => {
  it('passes the category to the meal plan check', () => {
    const passes = foodFilter(
      { ...noFilters, mealPlan: true },
      [],
      (food, categoryId) => food.name === 'Brisket' && categoryId === 'Entrees',
    );
    expect(passes(items[2], 'Entrees')).toBe(true);
    expect(passes(items[2], 'Sides')).toBe(false);
  });

  it('ignores cleared allergen and diet choices', () => {
    const passes = foodFilter(
      { ...noFilters, allergens: { egg: false }, dietary: { vegan: false } },
      [],
    );
    expect(items.every((food) => passes(food))).toBe(true);
  });
});

describe('hasActiveFilters', () => {
  it('is off with nothing chosen or only cleared choices', () => {
    expect(hasActiveFilters(noFilters)).toBe(false);
    expect(hasActiveFilters({ ...noFilters, allergens: { egg: false } })).toBe(false);
  });

  it('is on when any filter is chosen', () => {
    expect(hasActiveFilters({ ...noFilters, favorites: true })).toBe(true);
    expect(hasActiveFilters({ ...noFilters, mealPlan: true })).toBe(true);
    expect(hasActiveFilters({ ...noFilters, allergens: { egg: true } })).toBe(true);
    expect(hasActiveFilters({ ...noFilters, dietary: { vegan: true } })).toBe(true);
  });
});
