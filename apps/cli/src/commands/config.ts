import type { Json, Tables } from '@ut-dining/supabase';
import {
  arg,
  type Command,
  type Context,
  check,
  commit,
  required,
  requireYes,
  str,
} from '../context.ts';
import { CliError, table } from '../output.ts';
import { moveItem, parsePosition, parseVersion } from '../parse.ts';

type AppInformation = Tables<'app_information'>;

interface SupportLink {
  id: string;
  label: string;
  url: string;
  order: number;
}

interface Contributor {
  id: string;
  name: string;
  order: number;
}

const DEFAULT_TITLE = 'UT Dining';
const DEFAULT_DESCRIPTION = 'Find dining locations, menus, and meal times across UT Austin campus.';

const getInfo = async (ctx: Context): Promise<AppInformation | null> => {
  const rows = check(await ctx.db.from('app_information').select('*').order('created_at').limit(1));
  return rows[0] ?? null;
};

const saveInfo = async (
  ctx: Context,
  info: AppInformation | null,
  patch: Partial<AppInformation>,
) => {
  const now = new Date().toISOString();
  if (info) {
    return check(
      await ctx.db
        .from('app_information')
        .update({ ...patch, updated_at: now })
        .eq('id', info.id)
        .select('id')
        .single(),
    );
  }
  return check(
    await ctx.db
      .from('app_information')
      .insert({
        about_title: DEFAULT_TITLE,
        about_description: DEFAULT_DESCRIPTION,
        ...patch,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single(),
  );
};

const asList = <T>(value: Json | null | undefined): T[] =>
  Array.isArray(value)
    ? ([...(value as unknown as T[])] as T[]).sort(
        (a, b) => (a as { order: number }).order - (b as { order: number }).order,
      )
    : [];

const renumber = <T extends { order: number }>(items: T[]) =>
  items.map((item, index) => ({ ...item, order: index + 1 }));

const newId = () => `${Date.now()}`;

const findItem = <T extends { id: string }>(
  items: T[],
  query: string,
  label: (item: T) => string,
  kind: string,
) => {
  const needle = query.trim().toLowerCase();
  const byId = items.find((item) => item.id === query.trim());
  if (byId) return byId;
  const matches = items.filter((item) => label(item).toLowerCase().includes(needle));
  const exact = matches.filter((item) => label(item).toLowerCase() === needle);
  if (exact.length === 1) return exact[0];
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new CliError(`No ${kind} matches "${query}".`);
  throw new CliError(
    `"${query}" matches ${matches.length} ${kind}s: ${matches.map(label).join(', ')}. Use the id.`,
  );
};

const checkUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new CliError(`"${value}" is not an http(s) or mailto: URL.`);
  }
  return value;
};

interface ListSpec<T extends { id: string; order: number }> {
  noun: string;
  plural: string;
  column: 'support_links' | 'credits_contributors';
  label: (item: T) => string;
}

const listCommands = <T extends { id: string; order: number }>(
  spec: ListSpec<T>,
  build: {
    create: (ctx: Context, opts: Record<string, unknown>) => Omit<T, 'id' | 'order'>;
    edit: (item: T, opts: Record<string, unknown>) => T;
    addUsage: string;
    editUsage: string;
    addOptions: Command['options'];
  },
): Command[] => {
  const load = async (ctx: Context) => {
    const info = await getInfo(ctx);
    return { info, items: asList<T>(info?.[spec.column]) };
  };
  const save = (ctx: Context, info: AppInformation | null, items: T[]) =>
    saveInfo(ctx, info, { [spec.column]: renumber(items) as unknown as Json });
  return [
    {
      path: [spec.plural, 'list'],
      summary: `List ${spec.plural.replace('-', ' ')} in order`,
      usage: `${spec.plural} list`,
      run: async (ctx) => {
        const { items } = await load(ctx);
        ctx.out.result(items, () => table(items as unknown as Record<string, unknown>[]));
      },
    },
    {
      path: [spec.plural, 'add'],
      summary: `Add a ${spec.noun} (at the end, or at --position)`,
      usage: build.addUsage,
      options: { ...build.addOptions, position: { type: 'string' } },
      write: true,
      run: async (ctx, _args, opts) => {
        const { info, items } = await load(ctx);
        const item = { id: newId(), order: items.length + 1, ...build.create(ctx, opts) } as T;
        const position = str(opts, 'position');
        const next = position
          ? moveItem([...items, item], items.length, parsePosition(position, items.length + 1))
          : [...items, item];
        await commit(
          ctx,
          { action: `add ${spec.noun} ${spec.label(item)}`, before: items, after: renumber(next) },
          () => save(ctx, info, next),
        );
      },
    },
    {
      path: [spec.plural, 'update'],
      summary: `Change a ${spec.noun}`,
      usage: build.editUsage,
      options: build.addOptions,
      write: true,
      run: async (ctx, args, opts) => {
        const { info, items } = await load(ctx);
        const item = findItem(items, arg(args, 0, spec.noun), spec.label, spec.noun);
        const edited = build.edit(item, opts);
        const next = items.map((entry) => (entry.id === item.id ? edited : entry));
        await commit(
          ctx,
          { action: `update ${spec.noun} ${spec.label(item)}`, before: item, after: edited },
          () => save(ctx, info, next),
        );
      },
    },
    {
      path: [spec.plural, 'move'],
      summary: `Move a ${spec.noun} to a position (1 is first)`,
      usage: `${spec.plural} move <${spec.noun}> --to <position>`,
      options: { to: { type: 'string' } },
      write: true,
      run: async (ctx, args, opts) => {
        const { info, items } = await load(ctx);
        const item = findItem(items, arg(args, 0, spec.noun), spec.label, spec.noun);
        const next = moveItem(
          items,
          items.indexOf(item),
          parsePosition(str(opts, 'to'), items.length),
        );
        await commit(
          ctx,
          {
            action: `move ${spec.noun} ${spec.label(item)}`,
            before: items.map(spec.label),
            after: next.map(spec.label),
          },
          () => save(ctx, info, next),
        );
      },
    },
    {
      path: [spec.plural, 'remove'],
      summary: `Remove a ${spec.noun}`,
      usage: `${spec.plural} remove <${spec.noun}> --yes`,
      write: true,
      run: async (ctx, args, opts) => {
        const { info, items } = await load(ctx);
        const item = findItem(items, arg(args, 0, spec.noun), spec.label, spec.noun);
        if (!ctx.dryRun) requireYes(opts, `Removing ${spec.label(item)}`);
        const next = items.filter((entry) => entry.id !== item.id);
        await commit(ctx, { action: `remove ${spec.noun} ${spec.label(item)}`, before: item }, () =>
          save(ctx, info, next),
        );
      },
    },
  ];
};

export const configCommands: Command[] = [
  {
    path: ['config', 'show'],
    summary: 'Show the app settings row: about text, required app version, support links, credits',
    usage: 'config show',
    run: async (ctx) => {
      const info = await getInfo(ctx);
      ctx.out.result(info, () =>
        info
          ? [
              `About title:        ${info.about_title ?? ''}`,
              `About description:  ${info.about_description ?? ''}`,
              `Required version:   ${info.app_version}`,
              `Updated:            ${info.updated_at ?? ''}`,
              '',
              'Support links:',
              table(
                asList<SupportLink>(info.support_links) as unknown as Record<string, unknown>[],
              ),
              '',
              'Credits:',
              table(
                asList<Contributor>(info.credits_contributors) as unknown as Record<
                  string,
                  unknown
                >[],
              ),
            ].join('\n')
          : 'No app_information row yet. Any config command that writes will create it.',
      );
    },
  },
  {
    path: ['config', 'set-about'],
    summary: "Change the About section's title and/or description",
    usage: 'config set-about [--title <text>] [--description <text>]',
    options: { title: { type: 'string' }, description: { type: 'string' } },
    write: true,
    run: async (ctx, _args, opts) => {
      const title = str(opts, 'title');
      const description = str(opts, 'description');
      if (title === undefined && description === undefined)
        throw new CliError('Pass --title and/or --description.');
      const info = await getInfo(ctx);
      const patch = {
        ...(title === undefined ? {} : { about_title: title }),
        ...(description === undefined ? {} : { about_description: description }),
      };
      await commit(
        ctx,
        {
          action: 'update the About section',
          before: { about_title: info?.about_title, about_description: info?.about_description },
          after: patch,
        },
        () => saveInfo(ctx, info, patch),
      );
    },
  },
  {
    path: ['config', 'set-app-version'],
    summary: 'Set the minimum app version. Older installs get a forced update prompt.',
    usage: 'config set-app-version <x.y.z> --yes',
    details:
      'app_information.app_version is the version every install must be on. Setting it above the version live in the App Store locks users out until they can update, so only raise it after the release is live.',
    write: true,
    run: async (ctx, args, opts) => {
      const version = parseVersion(arg(args, 0, 'version'));
      const info = await getInfo(ctx);
      if (!ctx.dryRun) requireYes(opts, `Forcing every install below ${version} to update`);
      await commit(
        ctx,
        {
          action: `set the required app version to ${version}`,
          before: info?.app_version,
          after: version,
        },
        () => saveInfo(ctx, info, { app_version: version }),
      );
    },
  },
  ...listCommands<SupportLink>(
    { noun: 'link', plural: 'support-links', column: 'support_links', label: (link) => link.label },
    {
      addUsage: 'support-links add --label <text> --url <url> [--position <n>]',
      editUsage: 'support-links update <link> [--label <text>] [--url <url>]',
      addOptions: { label: { type: 'string' }, url: { type: 'string' } },
      create: (_ctx, opts) => ({
        label: required(opts as never, 'label'),
        url: checkUrl(required(opts as never, 'url')),
      }),
      edit: (item, opts) => {
        const label = str(opts as never, 'label');
        const url = str(opts as never, 'url');
        if (label === undefined && url === undefined)
          throw new CliError('Pass --label and/or --url.');
        return {
          ...item,
          ...(label === undefined ? {} : { label }),
          ...(url === undefined ? {} : { url: checkUrl(url) }),
        };
      },
    },
  ),
  ...listCommands<Contributor>(
    {
      noun: 'contributor',
      plural: 'credits',
      column: 'credits_contributors',
      label: (person) => person.name,
    },
    {
      addUsage: 'credits add --name <name> [--position <n>]',
      editUsage: 'credits update <contributor> --name <name>',
      addOptions: { name: { type: 'string' } },
      create: (_ctx, opts) => ({ name: required(opts as never, 'name') }),
      edit: (item, opts) => ({ ...item, name: required(opts as never, 'name') }),
    },
  ),
];
