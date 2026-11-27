import { mergeAllergens, resolveAllergens } from './allergens.ts';
import { LOCATIONS, shortMenuUrl } from './config.ts';
import {
  checkMenuPage,
  checkShortMenu,
  isBlankLabel,
  type Problem,
  unknownIcons,
} from './health.ts';
import type { HttpClient } from './http.ts';
import { parseLabel, parseMealLinks, parseMenuPage } from './parse.ts';
import type { Food, Label, LocationDay, Menu, MenuPage, MenuRow } from './types.ts';

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
  blankLabels: number;
  notPosted: number;
  problems: Problem[];
  unrecognizedAllergens: Set<string>;
  unknownIcons: Set<string>;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const scrape = async (http: HttpClient, dates: string[]): Promise<ScrapeResult> => {
  const labels = new Map<string, Promise<Label>>();
  const failures: ScrapeFailure[] = [];
  const unrecognizedAllergens = new Set<string>();
  const unknownIconFiles = new Set<string>();
  const problems: Problem[] = [];
  let blankLabels = 0;
  let notPosted = 0;

  const label = (recipe: string, link: string) => {
    let pending = labels.get(recipe);
    if (!pending) {
      pending = http.get(link).then((html) => {
        const parsed = parseLabel(html);
        for (const text of parsed.unrecognized) unrecognizedAllergens.add(text);
        if (isBlankLabel(parsed)) blankLabels++;
        return parsed;
      });
      labels.set(recipe, pending);
    }
    return pending;
  };

  const buildMenu = async (page: MenuPage): Promise<Menu | null> => {
    const menuCategories = await Promise.all(
      page.categories.map(async ({ categoryName, rows }) => {
        const byName = new Map<string, MenuRow[]>();
        for (const row of rows) byName.set(row.name, [...(byName.get(row.name) ?? []), row]);
        const foods = await Promise.all(
          [...byName.values()].map(async (variants): Promise<Food> => {
            const labels = await Promise.all(variants.map((row) => label(row.recipe, row.link)));
            return {
              name: variants[0].name,
              link: variants[0].link,
              allergens: mergeAllergens(
                variants.map((row, index) => resolveAllergens(row.icons, labels[index].allergens)),
              ),
              nutrition: labels[0].nutrition,
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
      const html = await http.get(url);
      mealLinks = parseMealLinks(html);
      const status = checkShortMenu(html, mealLinks);
      if (status === 'not-posted') notPosted++;
      if (status === 'unrecognized') {
        problems.push({
          kind: 'layout',
          locationName: location.name,
          date,
          url,
          detail: 'The location page has no meal links and no "No Data Available" note',
        });
      }
    } catch (error) {
      failures.push({
        locationName: location.name,
        date,
        stage: 'location',
        url,
        error: message(error),
      });
      problems.push({
        kind: 'unreachable',
        locationName: location.name,
        date,
        url,
        detail: message(error),
      });
      return null;
    }

    let complete = true;
    const menus = await Promise.all(
      mealLinks.map(async (link) => {
        try {
          const html = await http.get(link);
          const page = parseMenuPage(html);
          const broken = checkMenuPage(html, page);
          if (broken) {
            complete = false;
            problems.push({
              kind: 'layout',
              locationName: location.name,
              date,
              url: link,
              detail: broken,
            });
          }
          for (const icon of unknownIcons(html)) unknownIconFiles.add(icon);
          return await buildMenu(page);
        } catch (error) {
          complete = false;
          failures.push({
            locationName: location.name,
            date,
            stage: 'menu',
            url: link,
            error: message(error),
          });
          problems.push({
            kind: 'unreachable',
            locationName: location.name,
            date,
            url: link,
            detail: message(error),
          });
          return null;
        }
      }),
    );

    return {
      locationName: location.name,
      date,
      menus: menus.filter((menu): menu is Menu => menu !== null),
      complete,
    };
  };

  const results = await Promise.all(
    dates.flatMap((date) => LOCATIONS.map((location) => scrapeLocationDay(location, date))),
  );

  return {
    days: results.filter((day): day is LocationDay => day !== null),
    failures,
    labels: labels.size,
    blankLabels,
    notPosted,
    problems,
    unrecognizedAllergens,
    unknownIcons: unknownIconFiles,
  };
};
