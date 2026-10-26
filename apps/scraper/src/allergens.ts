import {
  ALLERGEN_KEYS,
  type AllergenKey,
  type Allergens,
  DIETARY_KEYS,
  type FlagKey,
} from './types.ts';

const NOT_VEGAN: AllergenKey[] = ['milk', 'egg', 'fish', 'shellfish', 'beef', 'pork'];
const NOT_VEGETARIAN: AllergenKey[] = ['fish', 'shellfish', 'beef', 'pork'];

export const resolveAllergens = (icons: Set<FlagKey>, label: Set<AllergenKey>): Allergens => {
  const flags = Object.fromEntries(
    [...ALLERGEN_KEYS, ...DIETARY_KEYS].map((key) => [key, icons.has(key)]),
  ) as Allergens;
  for (const key of label) flags[key] = true;
  if (NOT_VEGAN.some((key) => flags[key])) flags.vegan = false;
  if (NOT_VEGETARIAN.some((key) => flags[key])) flags.vegetarian = false;
  return flags;
};
