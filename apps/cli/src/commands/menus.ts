import { toCentralTime } from '@ut-dining/core';
import { type Command, type Context, check, required, str } from '../context.ts';
import { CliError, table } from '../output.ts';
import { parseDate } from '../parse.ts';
import { matchLocation } from './locations.ts';

const READ_ONLY_NOTE =
  'Menus, categories and food items are written by the scraper every day, so the CLI only reads them. To change them, fix the scraper (apps/scraper) and re-run it.';

const loadMenus = async (ctx: Context, opts: Record<string, unknown>) => {
  const locations = check(await ctx.db.from('location').select('id, name, colloquial_name'));
  const location = matchLocation(locations, required(opts as never, 'location'));
  const dateText = str(opts as never, 'date');
  const date = dateText ? parseDate(dateText) : toCentralTime().date;
  const menus = check(
    await ctx.db
      .from('menu')
      .select('id, name, date, menu_category(id, title, food_item(id, name))')
      .eq('location_id', location.id)
      .eq('date', date)
      .order('id'),
  );
  return { location, date, menus };
};

export const menuCommands: Command[] = [
  {
    path: ['menus', 'list'],
    summary: "List a location's menus for a day, with category and item counts (read only)",
    usage: 'menus list --location <location> [--date YYYY-MM-DD]',
    details: `--date defaults to today in Central time. ${READ_ONLY_NOTE}`,
    options: { location: { type: 'string' }, date: { type: 'string' } },
    run: async (ctx, _args, opts) => {
      const { location, date, menus } = await loadMenus(ctx, opts);
      const rows = menus.map((menu) => ({
        menu: menu.name,
        categories: menu.menu_category.length,
        items: menu.menu_category.reduce((sum, category) => sum + category.food_item.length, 0),
        id: menu.id,
      }));
      ctx.out.result(
        { location: location.name, date, menus: rows },
        () => `${location.name} on ${date}\n${table(rows)}`,
      );
    },
  },
  {
    path: ['menus', 'categories'],
    summary: 'List the categories and food items in one menu (read only)',
    usage: 'menus categories --location <location> --menu <name> [--date YYYY-MM-DD]',
    details: READ_ONLY_NOTE,
    options: { location: { type: 'string' }, date: { type: 'string' }, menu: { type: 'string' } },
    run: async (ctx, _args, opts) => {
      const { location, date, menus } = await loadMenus(ctx, opts);
      const name = required(opts, 'menu').toLowerCase();
      const menu = menus.find((entry) => entry.name?.toLowerCase() === name);
      if (!menu) {
        throw new CliError(
          `No "${name}" menu for ${location.name} on ${date}. Menus: ${menus.map((entry) => entry.name).join(', ') || 'none'}.`,
        );
      }
      const categories = menu.menu_category.map((category) => ({
        category: category.title,
        items: category.food_item.map((item) => item.name),
      }));
      ctx.out.result({ location: location.name, date, menu: menu.name, categories }, () =>
        categories
          .map(
            (category) =>
              `${category.category}\n${category.items.map((item) => `  - ${item}`).join('\n')}`,
          )
          .join('\n'),
      );
    },
  },
];
