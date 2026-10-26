import { load } from 'cheerio/slim';
import type { AllergenKey, FlagKey, Label, MenuPage, MenuRow, Nutrition } from './types.ts';

export const FOODPRO_BASE = 'https://hf-foodpro.austin.utexas.edu/foodpro/';

const ICON_FLAGS: Record<string, FlagKey> = {
  beef: 'beef',
  eggs: 'egg',
  egg: 'egg',
  fish: 'fish',
  milk: 'milk',
  peanuts: 'peanuts',
  pork: 'pork',
  shellfish: 'shellfish',
  soy: 'soy',
  tree_nuts: 'tree_nuts',
  wheat: 'wheat',
  sesame: 'sesame_seeds',
  vegan: 'vegan',
  veggie: 'vegetarian',
  halal: 'halal',
};

const LABEL_ALLERGENS: Record<string, AllergenKey> = {
  beef: 'beef',
  eggs: 'egg',
  egg: 'egg',
  fish: 'fish',
  milk: 'milk',
  peanuts: 'peanuts',
  pork: 'pork',
  shellfish: 'shellfish',
  'crustacean shellfish': 'shellfish',
  soybeans: 'soy',
  soy: 'soy',
  'tree nuts': 'tree_nuts',
  wheat: 'wheat',
  sesame: 'sesame_seeds',
};

const NUTRIENTS = [
  ['totalFat', 'Total Fat', 'g'],
  ['saturatedFat', 'Saturated Fat', 'g'],
  ['transFat', 'Trans Fat', 'g'],
  ['cholesterol', 'Cholesterol', 'mg'],
  ['sodium', 'Sodium', 'mg'],
  ['totalCarbohydrates', 'Total Carbohydrate', 'g'],
  ['dietaryFiber', 'Dietary Fiber', 'g'],
  ['totalSugars', 'Total Sugars', 'g'],
  ['protein', 'Protein', 'g'],
  ['vitaminD', 'Vitamin D', 'mcg'],
  ['calcium', 'Calcium', 'mg'],
  ['iron', 'Iron', 'mg'],
  ['potassium', 'Potassium', 'mg'],
] as const;

const absolute = (href: string) => new URL(href, FOODPRO_BASE).href;

export const parseMealLinks = (html: string): string[] => {
  const links = new Set<string>();
  for (const match of html.matchAll(/href\s*=\s*["']?(longmenu\.aspx[^"'\s>]*)/gi)) {
    links.add(absolute(match[1].replaceAll('&amp;', '&')));
  }
  return [...links];
};

const iconFlag = (src: string): FlagKey | undefined => {
  const file = src.slice(src.lastIndexOf('/') + 1).replace(/\.\w+$/, '');
  return ICON_FLAGS[file.toLowerCase().replaceAll(' ', '_')];
};

export const parseMenuPage = (html: string): MenuPage => {
  const $ = load(html);
  const header = $('a:has(div.longmenugridheader)').text();
  const type = header.split('Menu')[0].replaceAll(' ', '').trim() || 'Unknown';

  const categories: MenuPage['categories'] = [];
  const byName = new Map<string, MenuPage['categories'][number]>();
  let current: MenuPage['categories'][number] | undefined;

  $('.longmenucolmenucat, .longmenucoldispname').each((_, element) => {
    const cell = $(element);
    if (cell.hasClass('longmenucolmenucat')) {
      const categoryName =
        cell
          .text()
          .replace(/^--\s*|[\s-]*$/g, '')
          .trim() || 'Uncategorized';
      current = byName.get(categoryName);
      if (!current) {
        current = { categoryName, rows: [] };
        byName.set(categoryName, current);
        categories.push(current);
      }
      return;
    }
    if (!current) return;
    const anchor = cell.find('a').first();
    const name = anchor.text().trim();
    const href = anchor.attr('href');
    if (!name || !href) return;
    const link = absolute(href);
    const recipe = new URL(link).searchParams.get('RecNumAndPort') ?? link;
    const icons = new Set<FlagKey>();
    cell
      .closest('tr')
      .find('img')
      .each((_, img) => {
        const flag = iconFlag($(img).attr('src') ?? '');
        if (flag) icons.add(flag);
      });
    const row: MenuRow = { name, link, recipe, icons };
    current.rows.push(row);
  });

  return { type, categories: categories.filter((category) => category.rows.length > 0) };
};

const amount = (text: string, unit: string) => {
  const match = text.match(/([\d.]+)\s*(mcg|mg|g)\b/);
  return match ? `${match[1]}${match[2]}` : `0${unit}`;
};

export const parseLabel = (html: string): Label => {
  const $ = load(html);

  const rows = $('.nutfactstopnutrient')
    .map((_, element) => $(element).text())
    .get();
  const nutrient = (name: string, unit: string) => {
    const row = rows.find((text) => text.includes(name));
    return row ? amount(row, unit) : `0${unit}`;
  };

  const servingSizes = $('.nutfactsservsize');
  const ingredients = $('.labelingredientsvalue').text().trim();

  const nutrition = {
    servingSize: servingSizes.length > 1 ? servingSizes.eq(1).text().trim() : '',
    calories: Number.parseFloat($('.nutfactscaloriesval').text().trim()) || 0,
    ...Object.fromEntries(NUTRIENTS.map(([key, name, unit]) => [key, nutrient(name, unit)])),
    ingredients: ingredients || undefined,
  } as Nutrition;

  const allergens = new Set<AllergenKey>();
  const unrecognized: string[] = [];
  for (const part of $('.labelallergensvalue').text().split(',')) {
    const text = part.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const key = LABEL_ALLERGENS[text.toLowerCase()];
    if (key) allergens.add(key);
    else unrecognized.push(text);
  }

  return { nutrition, allergens, unrecognized };
};
