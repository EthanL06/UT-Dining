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
  requireYes,
  str,
} from '../context.ts';
import { CliError, table } from '../output.ts';
import {
  CHANGELOG_ICONS,
  type ChangelogChange,
  compareVersions,
  normalizeChanges,
  parseChange,
  parseDate,
  parseVersion,
} from '../parse.ts';

type Entry = Tables<'changelog'>;

const fetchAll = async (ctx: Context): Promise<Entry[]> =>
  check(await ctx.db.from('changelog').select('*')).sort((a, b) =>
    compareVersions(b.version, a.version),
  );

const fetchOne = async (ctx: Context, version: string) =>
  checkMaybe(await ctx.db.from('changelog').select('*').eq('version', version).maybeSingle());

const findOne = async (ctx: Context, version: string) => {
  const entry = await fetchOne(ctx, version);
  if (!entry) throw new CliError(`No changelog entry for ${version}. Run \`changelog list\`.`);
  return entry;
};

const render = (entry: Entry) =>
  [
    `${entry.version}  ${entry.is_published ? 'published' : 'draft'}  ${entry.release_date ?? 'no date'}`,
    entry.summary ? `  ${entry.summary}` : '',
    ...(entry.changes as unknown as ChangelogChange[]).map(
      (change) =>
        `  - [${change.icon}] ${change.title}${change.description ? `: ${change.description}` : ''}`,
    ),
  ]
    .filter(Boolean)
    .join('\n');

const setPublished = (published: boolean): Command => ({
  path: ['changelog', published ? 'publish' : 'unpublish'],
  summary: published
    ? 'Publish an entry so the app shows it'
    : 'Hide an entry from the app (keeps it as a draft)',
  usage: `changelog ${published ? 'publish' : 'unpublish'} <version>`,
  write: true,
  run: async (ctx, args) => {
    const entry = await findOne(ctx, parseVersion(arg(args, 0, 'version')));
    await commit(
      ctx,
      {
        action: `${published ? 'publish' : 'unpublish'} ${entry.version}`,
        before: entry.is_published,
        after: published,
      },
      async () =>
        check(
          await ctx.db
            .from('changelog')
            .update({ is_published: published, updated_at: new Date().toISOString() })
            .eq('id', entry.id)
            .select('id')
            .single(),
        ),
    );
  },
});

export const changelogCommands: Command[] = [
  {
    path: ['changelog', 'list'],
    summary: 'List changelog entries, newest version first',
    usage: 'changelog list',
    run: async (ctx) => {
      const entries = await fetchAll(ctx);
      ctx.out.result(entries, () =>
        table(
          entries.map((entry) => ({
            version: entry.version,
            status: entry.is_published ? 'published' : 'draft',
            release_date: entry.release_date,
            changes: (entry.changes as unknown as unknown[]).length,
            summary: entry.summary,
          })),
        ),
      );
    },
  },
  {
    path: ['changelog', 'get'],
    summary: 'Show one entry',
    usage: 'changelog get <version>',
    run: async (ctx, args) => {
      const entry = await findOne(ctx, parseVersion(arg(args, 0, 'version')));
      ctx.out.result(entry, () => render(entry));
    },
  },
  {
    path: ['changelog', 'icons'],
    summary: 'List the icons a change can use',
    usage: 'changelog icons',
    run: async (ctx) => {
      ctx.out.result(CHANGELOG_ICONS, () => CHANGELOG_ICONS.join('\n'));
    },
  },
  {
    path: ['changelog', 'upsert'],
    summary: 'Create an entry, or update the one with this version',
    usage:
      'changelog upsert <version> [--summary <text>] [--release-date YYYY-MM-DD|none] [--change "icon|Title|Description" ...] [--add-change ...] [--publish|--draft] [--file <entry.json|->]',
    details:
      'New entries start as drafts. On an existing entry, only the fields you pass change: --change replaces the whole list of changes, --add-change appends. The icon in a change is optional (defaults to sparkles); see `changelog icons`. --file takes {"summary","release_date","changes":[{"icon","title","description"}],"is_published"}.',
    examples: [
      'changelog upsert 2.0.0 --summary "A fresh look" --change "palette|New design|Every screen was redrawn." --change "zap|Faster menus"',
      'changelog upsert 2.0.0 --add-change "wifi-off|Works offline" --release-date 2026-12-05',
      'changelog upsert 2.0.0 --publish',
    ],
    options: {
      summary: { type: 'string' },
      'release-date': { type: 'string' },
      change: { type: 'string', multiple: true },
      'add-change': { type: 'string', multiple: true },
      publish: { type: 'boolean' },
      draft: { type: 'boolean' },
      file: { type: 'string' },
    },
    write: true,
    run: async (ctx, args, opts) => {
      const version = parseVersion(arg(args, 0, 'version'));
      if (opts.publish && opts.draft) throw new CliError('Pass --publish or --draft, not both.');
      const existing = await fetchOne(ctx, version);
      const fileText = str(opts, 'file');
      const file = (fileText ? readJson(fileText) : {}) as Record<string, unknown>;
      const patch: Partial<Entry> = {};

      if ('summary' in file) patch.summary = (file.summary as string | null) || null;
      if ('release_date' in file)
        patch.release_date = file.release_date ? parseDate(String(file.release_date)) : null;
      if ('changes' in file)
        patch.changes = normalizeChanges(file.changes) as unknown as NonNullable<Json>;
      if ('is_published' in file) patch.is_published = Boolean(file.is_published);

      const summary = str(opts, 'summary');
      if (summary !== undefined) patch.summary = summary.trim() || null;
      const releaseDate = str(opts, 'release-date');
      if (releaseDate !== undefined)
        patch.release_date = releaseDate === 'none' ? null : parseDate(releaseDate);
      const replace = list(opts, 'change');
      if (replace.length > 0)
        patch.changes = replace.map(parseChange) as unknown as NonNullable<Json>;
      const append = list(opts, 'add-change');
      if (append.length > 0) {
        const base = (patch.changes ?? existing?.changes ?? []) as unknown as ChangelogChange[];
        patch.changes = [...base, ...append.map(parseChange)] as unknown as NonNullable<Json>;
      }
      if (opts.publish) patch.is_published = true;
      if (opts.draft) patch.is_published = false;

      const changes = (patch.changes ?? existing?.changes ?? []) as unknown as ChangelogChange[];
      if (changes.length === 0)
        throw new CliError('An entry needs at least one change. Pass --change.');
      if (existing && Object.keys(patch).length === 0) throw new CliError('Nothing to change.');

      const row = { ...patch, updated_at: new Date().toISOString() };
      await commit(
        ctx,
        {
          action: `${existing ? 'update' : 'create'} changelog ${version}`,
          before: existing ?? undefined,
          after: { ...(existing ?? { version, is_published: false }), ...patch },
        },
        async () =>
          existing
            ? check(
                await ctx.db
                  .from('changelog')
                  .update(row)
                  .eq('id', existing.id)
                  .select('*')
                  .single(),
              )
            : check(
                await ctx.db
                  .from('changelog')
                  .insert({ version, is_published: false, ...row })
                  .select('*')
                  .single(),
              ),
        (entry) => (entry ? render(entry) : ''),
      );
    },
  },
  setPublished(true),
  setPublished(false),
  {
    path: ['changelog', 'delete'],
    summary: 'Delete an entry',
    usage: 'changelog delete <version> --yes',
    write: true,
    run: async (ctx, args, opts) => {
      const entry = await findOne(ctx, parseVersion(arg(args, 0, 'version')));
      if (!ctx.dryRun) requireYes(opts, `Deleting changelog ${entry.version}`);
      await commit(ctx, { action: `delete changelog ${entry.version}`, before: entry }, async () =>
        check(await ctx.db.from('changelog').delete().eq('id', entry.id).select('id')),
      );
    },
  },
];
