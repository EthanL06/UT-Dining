import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FLAG_KEYS = [
  'beef',
  'egg',
  'fish',
  'milk',
  'peanuts',
  'pork',
  'shellfish',
  'soy',
  'tree_nuts',
  'wheat',
  'sesame_seeds',
  'vegan',
  'vegetarian',
  'halal',
] as const;

type SampleFood = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  flags: string[];
  meals?: string[];
  days?: number[];
  blankNutrition?: boolean;
};

type SampleMenu = {
  location: string;
  days: number[];
  meals: string[];
  emptyMeals?: { day: number; meal: string }[];
  categories: { name: string; foods: SampleFood[] }[];
};

type SamplePlace = {
  name: string;
  scenario: string;
  set: Record<string, unknown>;
};

type SampleData = { menus: SampleMenu[]; places: SamplePlace[] };

const root = join(import.meta.dirname, '../../..');
const data: SampleData = JSON.parse(readFileSync(join(import.meta.dirname, 'data.json'), 'utf8'));

const todayInCentral = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const addDays = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const nutritionOf = (food: SampleFood): Record<string, string> => {
  if (food.blankNutrition) {
    return { servingSize: '', calories: '', protein: '', totalCarbohydrates: '' };
  }
  return {
    servingSize: '1 each',
    calories: food.calories,
    totalFat: '9g',
    saturatedFat: '2g',
    transFat: '0g',
    cholesterol: '15mg',
    sodium: '420mg',
    totalCarbohydrates: food.carbs,
    dietaryFiber: '3g',
    totalSugars: '5g',
    protein: food.protein,
    vitaminD: '0mcg',
    calcium: '60mg',
    iron: '2mg',
    potassium: '280mg',
    ingredients: `Sample ingredients for ${food.name}`,
  };
};

const allergensOf = (food: SampleFood) =>
  Object.fromEntries(FLAG_KEYS.map((key) => [key, food.flags.includes(key)]));

const buildDays = (today: string) =>
  data.menus.flatMap((menu) =>
    menu.days.map((offset) => ({
      locationName: menu.location,
      date: addDays(today, offset),
      menus: menu.meals.map((meal) => {
        const empty = menu.emptyMeals?.some((entry) => entry.day === offset && entry.meal === meal);
        return {
          type: meal,
          menuCategories: empty
            ? []
            : menu.categories
                .map((category) => ({
                  categoryName: category.name,
                  foods: category.foods
                    .filter((food) => !food.meals || food.meals.includes(meal))
                    .filter((food) => !food.days || food.days.includes(offset))
                    .map((food) => ({
                      name: food.name,
                      link: '',
                      nutrition: nutritionOf(food),
                      allergens: allergensOf(food),
                    })),
                }))
                .filter((category) => category.foods.length > 0),
        };
      }),
    })),
  );

const localStatus = (): Record<string, string> =>
  Object.fromEntries(
    execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((match): match is RegExpMatchArray => match !== null)
      .map((match) => [match[1], match[2]]),
  );

const status = localStatus();
const url = status.API_URL;
const key = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;

if (!url?.startsWith('http://127.0.0.1:')) {
  throw new Error(`API_URL is '${url}', not a local address. Refusing to write sample data.`);
}
if (!key) {
  throw new Error('No service role key in supabase status. Is local Supabase running?');
}

const headers = {
  apikey: key,
  authorization: `Bearer ${key}`,
  'content-type': 'application/json',
};

const request = async (path: string, init: RequestInit): Promise<unknown> => {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  if (!response.ok) {
    throw new Error(`${init.method} ${path} failed: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const today = process.env.SAMPLE_TODAY ?? todayInCentral();
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  throw new Error(`SAMPLE_TODAY must look like 2026-11-27, got '${today}'`);
}

const days = buildDays(today);
await request('rpc/insert_multiple_locations_and_menus', {
  method: 'POST',
  body: JSON.stringify({ arg_data_array: days }),
});
console.log(
  `  ok    ${days.length} menu days for ${data.menus.length} dining halls around ${today}`,
);

for (const place of data.places) {
  const rows = await request(`location?name=eq.${encodeURIComponent(place.name)}&select=id`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({ ...place.set, updated_at: new Date().toISOString() }),
  });
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Expected one location named '${place.name}' in supabase/seed.sql`);
  }
  console.log(`  ok    ${place.name}: ${place.scenario}`);
}

const changelog = JSON.parse(
  readFileSync(join(root, 'apps/mobile/e2e/fixtures/changelog.json'), 'utf8'),
);
await request('changelog?on_conflict=version', {
  method: 'POST',
  headers: { prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(changelog),
});
console.log(`  ok    ${changelog.length} changelog entries`);
