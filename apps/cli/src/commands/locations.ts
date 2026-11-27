import type { MealTime, ServiceHours } from '@ut-dining/core';
import type { Json, Tables } from '@ut-dining/supabase';
import {
  arg,
  type Command,
  type Context,
  check,
  checkMaybe,
  commit,
  list,
  readJson,
  required,
  requireYes,
  str,
} from '../context.ts';
import { CliError, table } from '../output.ts';
import {
  applyHours,
  checkPaymentMethods,
  formatHours,
  formatRanges,
  moveItem,
  parseAssignments,
  parseDays,
  parseMealTime,
  parsePosition,
  parseRanges,
} from '../parse.ts';

type Location = Tables<'location'>;

export const EDITABLE_FIELDS = [
  'name',
  'colloquial_name',
  'address',
  'description',
  'regular_service_hours',
  'methods_of_payment',
  'meal_times',
  'apple_maps_link',
  'google_maps_link',
  'image',
  'latitude',
  'longitude',
  'type_id',
  'force_close',
  'has_menus',
  'display_order',
] as const;

const REQUIRED_ON_CREATE = ['name', 'address', 'description', 'type_id'] as const;

const fetchLocations = async (ctx: Context): Promise<Location[]> =>
  check(await ctx.db.from('location').select('*').order('display_order', { ascending: true }));

export const matchLocation = <
  T extends { id: string; name: string | null; colloquial_name: string | null },
>(
  locations: T[],
  query: string,
): T => {
  const needle = query.trim().toLowerCase();
  const byId = locations.find((location) => location.id === query.trim());
  if (byId) return byId;
  const names = (location: T) =>
    [location.name, location.colloquial_name]
      .filter(Boolean)
      .map((name) => (name as string).toLowerCase());
  const exact = locations.filter((location) => names(location).includes(needle));
  if (exact.length === 1) return exact[0];
  const partial =
    exact.length > 1
      ? exact
      : locations.filter((location) => names(location).some((name) => name.includes(needle)));
  if (partial.length === 1) return partial[0];
  if (partial.length === 0) {
    throw new CliError(`No location matches "${query}". Run \`locations list\` to see them.`);
  }
  throw new CliError(
    `"${query}" matches ${partial.length} locations: ${partial.map((location) => location.name).join(', ')}. Use the id or a fuller name.`,
  );
};

const findLocation = async (ctx: Context, query: string) =>
  matchLocation(await fetchLocations(ctx), query);

const typeNames = async (ctx: Context) => {
  const types = check(await ctx.db.from('location_type').select('id, name'));
  return new Map(types.map((type) => [type.id, type.name]));
};

const resolveTypeId = async (ctx: Context, value: unknown) => {
  if (typeof value !== 'string') throw new CliError('type_id must be a location type id or name.');
  const types = check(await ctx.db.from('location_type').select('id, name'));
  const match = types.find(
    (type) => type.id === value || type.name.toLowerCase() === value.toLowerCase(),
  );
  if (!match) {
    throw new CliError(
      `Unknown location type "${value}". Types: ${types.map((type) => type.name).join(', ')}.`,
    );
  }
  return match.id;
};

const cleanPatch = async (ctx: Context, patch: Record<string, unknown>) => {
  const unknown = Object.keys(patch).filter(
    (key) => !(EDITABLE_FIELDS as readonly string[]).includes(key),
  );
  if (unknown.length > 0) {
    throw new CliError(
      `Unknown field(s): ${unknown.join(', ')}. Editable: ${EDITABLE_FIELDS.join(', ')}.`,
    );
  }
  const next = { ...patch };
  if ('type_id' in next) next.type_id = await resolveTypeId(ctx, next.type_id);
  if ('methods_of_payment' in next) checkPaymentMethods(next.methods_of_payment);
  return next;
};

const update = async (
  ctx: Context,
  location: Location,
  patch: Record<string, unknown>,
  action: string,
) => {
  const before = Object.fromEntries(
    Object.keys(patch).map((key) => [key, location[key as keyof Location]]),
  );
  await commit(
    ctx,
    { action, target: location.name ?? location.id, before, after: patch },
    async () =>
      check(
        await ctx.db
          .from('location')
          .update({ ...patch, updated_at: new Date().toISOString() } as never)
          .eq('id', location.id)
          .select('id, name')
          .single(),
      ),
  );
};

const summary = (location: Location, types: Map<string, string>) => ({
  order: location.display_order,
  name: location.name,
  colloquial: location.colloquial_name,
  type: types.get(location.type_id) ?? location.type_id,
  force_closed: location.force_close,
  has_menus: location.has_menus,
  id: location.id,
});

export const locationCommands: Command[] = [
  {
    path: ['locations', 'list'],
    summary: 'List every location in display order',
    usage: 'locations list',
    run: async (ctx) => {
      const [locations, types] = await Promise.all([fetchLocations(ctx), typeNames(ctx)]);
      const rows = locations.map((location) => summary(location, types));
      ctx.out.result(rows, () => table(rows));
    },
  },
  {
    path: ['locations', 'get'],
    summary: 'Show one location with all of its fields',
    usage: 'locations get <location>',
    details:
      '<location> is an id, a name or colloquial name, or a unique part of one ("j2", "jester city").',
    run: async (ctx, args) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      ctx.out.result(location, () =>
        [
          JSON.stringify(
            { ...location, regular_service_hours: undefined, meal_times: undefined },
            null,
            2,
          ),
          '',
          table(formatHours(location.regular_service_hours as unknown as ServiceHours)),
          '',
          table(
            (location.meal_times as unknown as MealTime[]).map((meal) => ({
              meal: meal.name,
              time: formatRanges([{ open: meal.start_time, close: meal.end_time }]),
            })),
          ),
        ].join('\n'),
      );
    },
  },
  {
    path: ['locations', 'types'],
    summary: 'List location types (used by type_id)',
    usage: 'locations types',
    run: async (ctx) => {
      const types = check(
        await ctx.db.from('location_type').select('id, name, display_order').order('display_order'),
      );
      ctx.out.result(types, () => table(types));
    },
  },
  {
    path: ['locations', 'create'],
    summary: 'Add a location from a JSON file',
    usage: 'locations create --file <location.json|->',
    details: `The JSON object uses the location table's fields: ${EDITABLE_FIELDS.join(', ')}. name, address, description and type_id (id or type name) are required. regular_service_hours defaults to closed every day; add hours afterwards with \`locations set-hours\`. methods_of_payment takes "Bevo Pay", "Cash", "Credit/Debit", "Dine In Dollars".`,
    options: { file: { type: 'string' } },
    write: true,
    run: async (ctx, _args, opts) => {
      const input = readJson(required(opts, 'file'));
      if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new CliError('The file must hold one JSON object.');
      const row = await cleanPatch(ctx, input as Record<string, unknown>);
      const missing = REQUIRED_ON_CREATE.filter((field) => !row[field]);
      if (missing.length > 0)
        throw new CliError(`Missing required field(s): ${missing.join(', ')}.`);
      const locations = await fetchLocations(ctx);
      const full: Record<string, unknown> = {
        regular_service_hours: applyHours(null, [], null),
        meal_times: [],
        methods_of_payment: [],
        apple_maps_link: '',
        google_maps_link: '',
        force_close: false,
        has_menus: false,
        display_order: locations.length,
        ...row,
      };
      await commit(
        ctx,
        { action: `create location ${String(full.name)}`, after: full },
        async () =>
          check(
            await ctx.db
              .from('location')
              .insert(full as never)
              .select('id, name')
              .single(),
          ),
        (result) => `Created ${result?.name} (${result?.id}).`,
      );
    },
  },
  {
    path: ['locations', 'update'],
    summary: 'Change fields on a location',
    usage: 'locations update <location> (--set field=value ... | --file <patch.json|->)',
    details: `Values are parsed as JSON when they can be (numbers, true/false, lists), otherwise kept as text. Editable fields: ${EDITABLE_FIELDS.join(', ')}. type_id takes a type id or name.`,
    examples: [
      'locations update "J2 Dining" --set description="Open late during finals"',
      'locations update j2 --set \'methods_of_payment=["Bevo Pay","Credit/Debit"]\'',
    ],
    options: { set: { type: 'string', multiple: true }, file: { type: 'string' } },
    write: true,
    run: async (ctx, args, opts) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      const file = str(opts, 'file');
      const raw = file ? readJson(file) : parseAssignments(list(opts, 'set'));
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length === 0) {
        throw new CliError('Nothing to change. Pass --set field=value or --file.');
      }
      const patch = await cleanPatch(ctx, raw as Record<string, unknown>);
      await update(
        ctx,
        location,
        patch,
        `update ${Object.keys(patch).join(', ')} on ${location.name}`,
      );
    },
  },
  {
    path: ['locations', 'close'],
    summary: 'Force a location closed (shows Closed in the app regardless of hours)',
    usage: 'locations close <location>',
    write: true,
    run: async (ctx, args) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      await update(ctx, location, { force_close: true }, `force close ${location.name}`);
    },
  },
  {
    path: ['locations', 'open'],
    summary: 'Turn off force close so the location follows its hours again',
    usage: 'locations open <location>',
    write: true,
    run: async (ctx, args) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      await update(ctx, location, { force_close: false }, `clear force close on ${location.name}`);
    },
  },
  {
    path: ['locations', 'hours'],
    summary: "Show a location's weekly service hours",
    usage: 'locations hours <location>',
    run: async (ctx, args) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      const rows = formatHours(location.regular_service_hours as unknown as ServiceHours);
      ctx.out.result(
        {
          name: location.name,
          regular_service_hours: location.regular_service_hours,
          readable: rows,
        },
        () => `${location.name}\n${table(rows)}`,
      );
    },
  },
  {
    path: ['locations', 'set-hours'],
    summary: 'Set the service hours for some days',
    usage: 'locations set-hours <location> --days <days> (--ranges <ranges> | --closed)',
    details:
      'Days: monday..sunday, mon..sun, weekdays, weekends or all, comma separated. Ranges: comma separated open-close times such as 07:00-14:00,17:00-21:00 (also 7am-2pm or 0700-1400). Other days are kept.',
    examples: [
      'locations set-hours j2 --days weekdays --ranges 07:00-14:00,16:30-21:00',
      'locations set-hours "Jester City Market" --days sat,sun --closed',
    ],
    options: { days: { type: 'string' }, ranges: { type: 'string' }, closed: { type: 'boolean' } },
    write: true,
    run: async (ctx, args, opts) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      const days = parseDays(required(opts, 'days'));
      const rangesText = str(opts, 'ranges');
      if (!!rangesText === !!opts.closed)
        throw new CliError('Pass exactly one of --ranges or --closed.');
      const ranges = rangesText ? parseRanges(rangesText) : null;
      const current = location.regular_service_hours as unknown as ServiceHours;
      const next = applyHours(current, days, ranges);
      await commit(
        ctx,
        {
          action: `set ${days.join(', ')} hours on ${location.name} to ${ranges ? formatRanges(ranges) : 'Closed'}`,
          target: location.name ?? location.id,
          before: formatHours(current),
          after: formatHours(next),
        },
        async () =>
          check(
            await ctx.db
              .from('location')
              .update({
                regular_service_hours: next as unknown as NonNullable<Json>,
                updated_at: new Date().toISOString(),
              })
              .eq('id', location.id)
              .select('id')
              .single(),
          ),
      );
    },
  },
  {
    path: ['locations', 'set-meal-times'],
    summary: "Replace a location's meal times (Breakfast, Lunch, ...)",
    usage: 'locations set-meal-times <location> (--meal "Name=start-end" ... | --clear)',
    examples: ['locations set-meal-times j2 --meal Breakfast=07:00-10:30 --meal Lunch=10:30-14:00'],
    options: { meal: { type: 'string', multiple: true }, clear: { type: 'boolean' } },
    write: true,
    run: async (ctx, args, opts) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      const meals = list(opts, 'meal');
      if (meals.length === 0 && !opts.clear)
        throw new CliError('Pass --meal at least once, or --clear.');
      if (meals.length > 0 && opts.clear) throw new CliError('Pass --meal or --clear, not both.');
      const mealTimes = meals.map(parseMealTime).sort((a, b) => a.start_time - b.start_time);
      await update(
        ctx,
        location,
        { meal_times: mealTimes as unknown as Json[] },
        `set meal times on ${location.name}`,
      );
    },
  },
  {
    path: ['locations', 'move'],
    summary: 'Move a location to a position in the list (1 is first)',
    usage: 'locations move <location> --to <position>',
    options: { to: { type: 'string' } },
    write: true,
    run: async (ctx, args, opts) => {
      const locations = await fetchLocations(ctx);
      const location = matchLocation(locations, arg(args, 0, 'location'));
      const to = parsePosition(str(opts, 'to'), locations.length);
      const ordered = moveItem(locations, locations.indexOf(location), to);
      const changes = ordered
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => item.display_order !== index);
      await commit(
        ctx,
        {
          action: `move ${location.name} to position ${to + 1}`,
          before: locations.map((item) => item.name),
          after: ordered.map((item) => item.name),
        },
        async () => {
          const now = new Date().toISOString();
          for (const { item, index } of changes) {
            checkMaybe(
              await ctx.db
                .from('location')
                .update({ display_order: index, updated_at: now })
                .eq('id', item.id),
            );
          }
          return { updated: changes.length };
        },
      );
    },
  },
  {
    path: ['locations', 'delete'],
    summary: 'Delete a location and every menu under it',
    usage: 'locations delete <location> --yes',
    write: true,
    run: async (ctx, args, opts) => {
      const location = await findLocation(ctx, arg(args, 0, 'location'));
      const menus = await ctx.db
        .from('menu')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id);
      if (!ctx.dryRun)
        requireYes(opts, `Deleting ${location.name} and its ${menus.count ?? 0} menus`);
      await commit(
        ctx,
        { action: `delete ${location.name} and ${menus.count ?? 0} menus`, before: location },
        async () =>
          check(await ctx.db.from('location').delete().eq('id', location.id).select('id')),
      );
    },
  },
];
