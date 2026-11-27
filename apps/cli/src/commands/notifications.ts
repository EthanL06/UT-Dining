import { checkNotification, fetchAllPages } from '@ut-dining/core';
import {
  arg,
  type Command,
  type Context,
  check,
  checkMaybe,
  commit,
  required,
  str,
} from '../context.ts';
import { CliError, table } from '../output.ts';
import { PROD_REF } from '../target.ts';

const findType = async (ctx: Context, query: string) => {
  const types = check(await ctx.db.from('notification_types').select('id, name').order('name'));
  const needle = query.trim().toLowerCase();
  const match =
    types.find((type) => type.id === query.trim() || type.name.toLowerCase() === needle) ??
    (types.filter((type) => type.name.toLowerCase().includes(needle)).length === 1
      ? types.find((type) => type.name.toLowerCase().includes(needle))
      : undefined);
  if (!match)
    throw new CliError(
      `Unknown notification type "${query}". Types: ${types.map((type) => type.name).join(', ')}.`,
    );
  return match;
};

export const countAudience = async (ctx: Context) => {
  const { data, error } = await fetchAllPages((from, to) =>
    ctx.db
      .from('user_devices')
      .select('push_token')
      .not('push_token', 'is', null)
      .order('device_id')
      .range(from, to),
  );
  if (error) throw new CliError(`Supabase: ${error.message}`);
  return new Set((data ?? []).map((row) => row.push_token)).size;
};

const centralOffsetMinutes = (instant: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
};

export const parseScheduleTime = (value: string, now: Date = new Date()): Date => {
  const text = value.trim();
  let instant: Date;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    instant = new Date(text);
  } else {
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
    if (!match)
      throw new CliError(
        `--at looks like "2026-12-01 09:00" (Central time) or an ISO time with an offset, got "${value}".`,
      );
    const wall = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
    );
    const guess = new Date(wall - centralOffsetMinutes(new Date(wall)) * 60000);
    instant = new Date(wall - centralOffsetMinutes(guess) * 60000);
  }
  if (Number.isNaN(instant.getTime())) throw new CliError(`Can't read --at "${value}".`);
  if (instant.getTime() <= now.getTime()) throw new CliError('--at must be in the future.');
  return instant;
};

const formatCentral = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

const messageOptions = {
  title: { type: 'string' },
  body: { type: 'string' },
  type: { type: 'string' },
  redirect: { type: 'string' },
  send: { type: 'boolean' },
} as const;

const readMessage = async (ctx: Context, opts: Record<string, unknown>) => {
  const title = required(opts as never, 'title');
  const body = required(opts as never, 'body');
  const type = await findType(ctx, required(opts as never, 'type'));
  const checked = checkNotification({ title, body, redirectUrl: str(opts as never, 'redirect') });
  if (!checked.ok) throw new CliError(checked.error);
  const { redirectUrl } = checked.value;
  return {
    title: checked.value.title,
    body: checked.value.body,
    type,
    redirect: redirectUrl ?? undefined,
  };
};

const PUSH_WARNING =
  'Push notifications reach real phones. Always show Ethan the exact title and body and get his OK before sending or scheduling one, on any target.';

export const notificationCommands: Command[] = [
  {
    path: ['notifications', 'types'],
    summary: 'List notification types (used by --type)',
    usage: 'notifications types',
    run: async (ctx) => {
      const types = check(await ctx.db.from('notification_types').select('id, name').order('name'));
      ctx.out.result(types, () => table(types));
    },
  },
  {
    path: ['notifications', 'scheduled'],
    summary: 'List scheduled notifications that have not been sent',
    usage: 'notifications scheduled',
    run: async (ctx) => {
      const rows = check(
        await ctx.db
          .from('notifications')
          .select('id, title, body, redirect_url, scheduled_at, sent, notification_types(name)')
          .not('scheduled_at', 'is', null)
          .eq('sent', false)
          .order('scheduled_at'),
      );
      ctx.out.result(rows, () =>
        table(
          rows.map((row) => ({
            when_central: formatCentral(row.scheduled_at),
            type: row.notification_types?.name,
            title: row.title,
            body: row.body,
            id: row.id,
          })),
        ),
      );
    },
  },
  {
    path: ['notifications', 'history'],
    summary: 'List recent notifications, sent or scheduled',
    usage: 'notifications history [--limit <n>]',
    options: { limit: { type: 'string' } },
    run: async (ctx, _args, opts) => {
      const limit = Number(str(opts, 'limit') ?? 20);
      if (!Number.isInteger(limit) || limit < 1)
        throw new CliError('--limit must be a positive whole number.');
      const rows = check(
        await ctx.db
          .from('notifications')
          .select('id, title, body, sent, scheduled_at, created_at, notification_types(name)')
          .order('created_at', { ascending: false })
          .limit(limit),
      );
      ctx.out.result(rows, () =>
        table(
          rows.map((row) => ({
            created_central: formatCentral(row.created_at),
            sent: row.sent,
            scheduled_central: formatCentral(row.scheduled_at),
            type: row.notification_types?.name,
            title: row.title,
            id: row.id,
          })),
        ),
      );
    },
  },
  {
    path: ['notifications', 'send'],
    summary: 'Send a push notification to every device now. Preview only unless --send.',
    usage:
      'notifications send --title <text> --body <text> --type <type> [--redirect <url>] [--send --confirm-devices <n>]',
    details: `Without --send this only previews the message and prints how many devices would get it. To send, pass --send and --confirm-devices with the device count from the preview; a stale count is refused. It calls the manual-push-notification edge function, like the dashboard. ${PUSH_WARNING}`,
    examples: [
      'notifications send --title "J2 is closed" --body "J2 Dining is closed today for maintenance." --type "Location Update"',
      'notifications send --title "J2 is closed" --body "..." --type "Location Update" --send --confirm-devices 1234',
    ],
    options: { ...messageOptions, 'confirm-devices': { type: 'string' } },
    write: true,
    run: async (ctx, _args, opts) => {
      const message = await readMessage(ctx, opts);
      const devices = await countAudience(ctx);
      const preview = {
        title: message.title,
        body: message.body,
        type: message.type.name,
        redirect_url: message.redirect ?? null,
        devices,
      };
      if (!opts.send || ctx.dryRun) {
        ctx.out.result({ ...preview, applied: false }, () =>
          [
            `Preview only. Nothing was sent.`,
            `  Title:    ${message.title}`,
            `  Body:     ${message.body}`,
            `  Type:     ${message.type.name}`,
            `  Redirect: ${message.redirect ?? '(none)'}`,
            `  Devices:  ${devices} on ${ctx.target.name}`,
            '',
            `To send: add --send --confirm-devices ${devices}${ctx.target.name === 'prod' ? ` --confirm-prod ${PROD_REF}` : ''}`,
          ].join('\n'),
        );
        return;
      }
      if (str(opts, 'confirm-devices') !== String(devices)) {
        throw new CliError(
          `Refusing to send: --confirm-devices must be the current device count (${devices}). Run without --send to preview first.`,
        );
      }
      const { data, error } = await ctx.db.functions.invoke('manual-push-notification', {
        body: {
          title: message.title,
          body: message.body,
          redirect_url: message.redirect,
          type: message.type.id,
        },
      });
      if (error) {
        const context = (error as { context?: Response }).context;
        const detail = context ? await context.text().catch(() => '') : '';
        throw new CliError(
          `The manual-push-notification function failed: ${error.message} ${detail}`.trim(),
        );
      }
      ctx.out.result(
        { ...preview, applied: true, result: data },
        () => `Sent to ${data?.sent ?? '?'} devices.`,
      );
    },
  },
  {
    path: ['notifications', 'schedule'],
    summary: 'Schedule a push notification for later. Preview only unless --send.',
    usage:
      'notifications schedule --at <"YYYY-MM-DD HH:MM" Central | ISO time> --title <text> --body <text> --type <type> [--redirect <url>] [--send]',
    details: `Adds a row to notifications that the scheduled-push-notification function sends to every device at that time. Without --send it only previews. Cancel with \`notifications cancel <id>\`. ${PUSH_WARNING}`,
    options: { ...messageOptions, at: { type: 'string' } },
    write: true,
    run: async (ctx, _args, opts) => {
      const at = parseScheduleTime(required(opts, 'at'));
      const message = await readMessage(ctx, opts);
      const devices = await countAudience(ctx);
      const row = {
        title: message.title,
        body: message.body,
        redirect_url: message.redirect,
        scheduled_at: at.toISOString(),
        type: message.type.id,
      };
      const preview = {
        ...row,
        type: message.type.name,
        scheduled_central: formatCentral(row.scheduled_at),
        devices_now: devices,
      };
      if (!opts.send || ctx.dryRun) {
        ctx.out.result({ ...preview, applied: false }, () =>
          [
            'Preview only. Nothing was scheduled.',
            `  When:    ${preview.scheduled_central} Central (${row.scheduled_at})`,
            `  Title:   ${message.title}`,
            `  Body:    ${message.body}`,
            `  Type:    ${message.type.name}`,
            `  Devices: ${devices} right now on ${ctx.target.name}`,
            '',
            'To schedule: add --send',
          ].join('\n'),
        );
        return;
      }
      const inserted = check(await ctx.db.from('notifications').insert(row).select('id').single());
      ctx.out.result(
        { ...preview, applied: true, id: inserted.id },
        () => `Scheduled for ${preview.scheduled_central} Central (id ${inserted.id}).`,
      );
    },
  },
  {
    path: ['notifications', 'cancel'],
    summary: 'Cancel a scheduled notification that has not been sent',
    usage: 'notifications cancel <id>',
    write: true,
    run: async (ctx, args) => {
      const id = arg(args, 0, 'id');
      const row = checkMaybe(
        await ctx.db.from('notifications').select('*').eq('id', id).maybeSingle(),
      );
      if (!row) throw new CliError(`No notification ${id}. Run \`notifications scheduled\`.`);
      if (row.sent || !row.scheduled_at)
        throw new CliError('That notification was already sent, so it cannot be cancelled.');
      await commit(
        ctx,
        {
          action: `cancel the notification "${row.title}" at ${formatCentral(row.scheduled_at)}`,
          before: row,
        },
        async () =>
          check(
            await ctx.db.from('notifications').delete().eq('id', id).eq('sent', false).select('id'),
          ),
      );
    },
  },
];
