import { resolveAllergens } from './allergens.ts';
import { LOCATIONS, shortMenuUrl } from './config.ts';
import type { HttpClient } from './http.ts';
import { parseLabel, parseMealLinks, parseMenuPage } from './parse.ts';
import type { Food, Label, LocationDay, Menu, MenuPage } from './types.ts';

export interface ScrapeFailure {
  locationName: string;
  date: string;
  stage: 'location' | 'menu';
  url: string;
  error: string;
}

export interface ScrapeResult {
  days: LocationDay[];
  failures: ScrapeFailure[];
  labels: number;
  unrecognizedAllergens: Set<string>;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const scrape = async (http: HttpClient, dates: string[]): Promise<ScrapeResult> => {
  const labels = new Map<string, Promise<Label>>();
  const failures: ScrapeFailure[] = [];
  const unrecognizedAllergens = new Set<string>();

  const label = (recipe: string, link: string) => {
    let pending = labels.get(recipe);
    if (!pending) {
      pending = http.get(link).then((html) => {
        const parsed = parseLabel(html);
        for (const text of parsed.unrecognized) unrecognizedAllergens.add(text);
        return parsed;
      });
      labels.set(recipe, pending);
    }
    return pending;
  };

  const buildMenu = async (page: MenuPage): Promise<Menu | null> => {
    const menuCategories = await Promise.all(
      page.categories.map(async ({ categoryName, rows }) => {
        const seen = new Set<string>();
        const unique = rows.filter((row) => !seen.has(row.name) && seen.add(row.name));
        const foods = await Promise.all(
          unique.map(async (row): Promise<Food> => {
            const { nutrition, allergens } = await label(row.recipe, row.link);
            return {
              name: row.name,
              link: row.link,
              allergens: resolveAllergens(row.icons, allergens),
              nutrition,
            };
          }),
        );
        return { categoryName, foods };
      }),
    );
    const nonEmpty = menuCategories.filter((category) => category.foods.length > 0);
    return nonEmpty.length > 0 ? { type: page.type, menuCategories: nonEmpty } : null;
  };

  const scrapeLocationDay = async (
    location: (typeof LOCATIONS)[number],
    date: string,
  ): Promise<LocationDay | null> => {
    const url = shortMenuUrl(location, date);
    let mealLinks: string[];
    try {
      mealLinks = parseMealLinks(await http.get(url));
    } catch (error) {
      failures.push({
        locationName: location.name,
        date,
        stage: 'location',
        url,
        error: message(error),
      });
      return null;
    }

    const menus = await Promise.all(
      mealLinks.map(async (link) => {
        try {
          return await buildMenu(parseMenuPage(await http.get(link)));
        } catch (error) {
          failures.push({
            locationName: location.name,
            date,
            stage: 'menu',
            url: link,
            error: message(error),
          });
          return null;
        }
      }),
    );

    return {
      locationName: location.name,
      date,
      menus: menus.filter((menu): menu is Menu => menu !== null),
    };
  };

  const results = await Promise.all(
    dates.flatMap((date) => LOCATIONS.map((location) => scrapeLocationDay(location, date))),
  );

  return {
    days: results.filter((day): day is LocationDay => day !== null),
    failures,
    labels: labels.size,
    unrecognizedAllergens,
  };
};
