import { describe, expect, it } from 'vitest';
import {
  buildDay,
  type Dish,
  dayCsv,
  dishesCsv,
  dishOf,
  exportLocation,
  type FoodItemRow,
  jsonLines,
  type LocationRow,
  type MenuRow,
  recipeOf,
  toCsv,
} from './build.ts';

const LINK =
  'https://hf-foodpro.austin.utexas.edu/foodpro/label.aspx?locationNum=12&dtdate=11%2f27%2f2026&RecNumAndPort=310109*3';

const item = (id: number, name: string, calories = '86'): FoodItemRow => ({
  id,
  name,
  link: LINK,
  nutrition: { calories, protein: '5.3g' },
  allergens: { vegan: true, milk: false },
});

const menu = (id: number, location: string, meal: string, items: FoodItemRow[]): MenuRow => ({
  id,
  date: '2026-11-27',
  name: meal,
  location: { id: `${location}-id`, name: location },
  menu_category: [{ id: id * 10, title: 'Grill', food_item: items }],
});

describe('recipeOf', () => {
  it('reads the FoodPro recipe number from a label link', () => {
    expect(recipeOf(LINK)).toBe('310109*3');
    expect(recipeOf(null)).toBeNull();
    expect(recipeOf('not a url')).toBeNull();
  });
});

describe('dishOf', () => {
  it('gives the same dish the same id on any day', () => {
    expect(dishOf(item(1, 'Beans'), '2026-11-27').id).toBe(
      dishOf(item(2, 'Beans'), '2026-12-01').id,
    );
  });

  it('gives a dish a new id when its nutrition changes', () => {
    expect(dishOf(item(1, 'Beans'), '2026-11-27').id).not.toBe(
      dishOf(item(1, 'Beans', '90'), '2026-11-27').id,
    );
  });

  it('fills every nutrient and allergen key, with null for missing ones', () => {
    const dish = dishOf(item(1, ' Beans '), '2026-11-27');
    expect(dish.name).toBe('Beans');
    expect(dish.nutrition?.calories).toBe('86');
    expect(dish.nutrition?.sodium).toBeNull();
    expect(dish.allergens?.vegan).toBe(true);
    expect(dish.allergens?.wheat).toBeNull();
  });
});

describe('buildDay', () => {
  it('orders menus by location then meal and records dish dates', () => {
    const dishes = new Map<string, Dish>([
      [dishOf(item(1, 'Beans'), '2026-11-20').id, dishOf(item(1, 'Beans'), '2026-11-20')],
    ]);
    const day = buildDay(
      '2026-11-27',
      [
        menu(3, 'Kins Dining', 'Lunch', [item(5, 'Rice')]),
        menu(2, 'J2 Dining', 'Dinner', [item(4, 'Beans')]),
        menu(1, 'J2 Dining', 'Breakfast', [item(3, 'Eggs')]),
      ],
      dishes,
    );
    expect(day.menus.map((m) => `${m.location} ${m.meal}`)).toEqual([
      'J2 Dining Breakfast',
      'J2 Dining Dinner',
      'Kins Dining Lunch',
    ]);
    const beans = dishOf(item(1, 'Beans'), '2026-11-27').id;
    expect(dishes.get(beans)).toMatchObject({ first_seen: '2026-11-20', last_seen: '2026-11-27' });
    expect(dishes.size).toBe(3);
  });

  it('skips menus without a location', () => {
    const row = { ...menu(1, 'J2 Dining', 'Lunch', []), location: null };
    expect(buildDay('2026-11-27', [row], new Map()).menus).toEqual([]);
  });
});

describe('csv', () => {
  it('quotes cells with commas, quotes or newlines and leaves nulls empty', () => {
    expect(toCsv(['a', 'b', 'c'], [['x, y', 'say "hi"', null]])).toBe(
      'a,b,c\n"x, y","say ""hi""",\n',
    );
  });

  it('writes one row per menu item', () => {
    const day = buildDay(
      '2026-11-27',
      [menu(1, 'J2 Dining', 'Lunch', [item(1, 'Beans')])],
      new Map(),
    );
    const lines = dayCsv(day).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/^2026-11-27,J2 Dining,J2 Dining-id,Lunch,Grill,[0-9a-f]{12},Beans$/);
  });

  it('writes every nutrient and allergen column for a dish', () => {
    const [header, row] = dishesCsv([dishOf(item(1, 'Beans'), '2026-11-27')])
      .trim()
      .split('\n');
    expect(header.split(',')).toHaveLength(row.split(',').length);
  });
});

describe('jsonLines', () => {
  it('writes valid JSON with one value per line', () => {
    const text = jsonLines([{ a: 1 }, { b: 2 }]);
    expect(JSON.parse(text)).toEqual([{ a: 1 }, { b: 2 }]);
    expect(text.split('\n')).toHaveLength(5);
    expect(JSON.parse(jsonLines([]))).toEqual([]);
  });
});

describe('exportLocation', () => {
  it('renames force_close and drops placeholder map links', () => {
    const row: LocationRow = {
      id: 'x',
      name: 'Burrito Factory',
      colloquial_name: null,
      description: '',
      address: '2021 Guadalupe St.',
      latitude: 30.28,
      longitude: -97.74,
      google_maps_link: '.',
      apple_maps_link: 'https://maps.apple.com/?q=x',
      image: null,
      has_menus: null,
      force_close: true,
      methods_of_payment: ['Cash'],
      regular_service_hours: {},
      meal_times: [],
      display_order: 0,
      location_type: { name: 'Food & Drink' },
    };
    expect(exportLocation(row)).toMatchObject({
      type: 'Food & Drink',
      has_menus: false,
      temporarily_closed: true,
      google_maps_link: null,
      apple_maps_link: 'https://maps.apple.com/?q=x',
    });
  });
});
