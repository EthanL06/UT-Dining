#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { type ParseArgsOptionsConfig, parseArgs } from 'node:util';
import { changelogCommands } from './commands/changelog.ts';
import { configCommands } from './commands/config.ts';
import { locationCommands } from './commands/locations.ts';
import { menuCommands } from './commands/menus.ts';
import { notificationCommands } from './commands/notifications.ts';
import { statusCommands } from './commands/status.ts';
import type { Command, Options } from './context.ts';
import { CliError, createOutput } from './output.ts';
import {
  authenticate,
  connect,
  describeTarget,
  PROD_REF,
  resolveTarget,
  type Target,
} from './target.ts';

const NAME = 'pnpm -s admin';

export const commands: Command[] = [
  ...statusCommands,
  ...locationCommands,
  ...configCommands,
  ...changelogCommands,
  ...notificationCommands,
  ...menuCommands,
];

const GLOBAL_OPTIONS: ParseArgsOptionsConfig = {
  local: { type: 'boolean' },
  dev: { type: 'boolean' },
  prod: { type: 'boolean' },
  'confirm-prod': { type: 'string' },
  json: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  yes: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

const GROUPS: Record<string, string> = {
  status: 'Check the key and the target project',
  locations: 'Locations: details, hours, meal times, force close, order',
  config: 'App settings: About text, required app version',
  'support-links': 'Help & Support links shown in Settings',
  credits: 'Credits list shown in Settings',
  changelog: "What's New entries shown in the app",
  notifications: 'Push notifications: send, schedule, cancel, history',
  menus: 'Scraped menus and categories (read only)',
};

const GLOBAL_HELP = `Target (pick one, default --dev):
  --dev                 Hosted dev project. Needs SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_KEY.
  --local               Local Supabase from \`make db-up\`. Needs no env vars.
  --prod                Production. Needs SUPABASE_PROD_URL and SUPABASE_PROD_SERVICE_KEY.
                        Writes also need --confirm-prod ${PROD_REF}. Agents: ask Ethan first.

Global flags:
  --json                Print one JSON object on stdout: {"ok":true,"target":...,"data":...}
                        or {"ok":false,"error":...}. Notes go to stderr.
  --dry-run             Show what a write would change without writing.
  --yes                 Confirm a delete or another change that can't be undone.
  -h, --help            Help for any group or command.`;

const findCommand = (positionals: string[]) => {
  for (const length of [2, 1]) {
    const path = positionals.slice(0, length);
    const command = commands.find(
      (entry) =>
        entry.path.length === length && entry.path.every((part, index) => part === path[index]),
    );
    if (command) return { command, rest: positionals.slice(length) };
  }
  return null;
};

const optionHelp = (options: ParseArgsOptionsConfig | undefined) =>
  Object.entries(options ?? {})
    .map(
      ([name, option]) =>
        `  --${name}${option.type === 'string' ? ' <value>' : ''}${option.multiple ? ' (repeatable)' : ''}`,
    )
    .join('\n');

const commandHelp = (command: Command) =>
  [
    `Usage: ${NAME} ${command.usage}`,
    '',
    command.summary,
    command.details ? `\n${command.details}` : '',
    command.options ? `\nOptions:\n${optionHelp(command.options)}` : '',
    command.examples
      ? `\nExamples:\n${command.examples.map((example) => `  ${NAME} ${example}`).join('\n')}`
      : '',
    '',
    GLOBAL_HELP,
  ]
    .filter((line) => line !== '')
    .join('\n');

const groupHelp = (group: string) =>
  [
    `${GROUPS[group]}\n`,
    ...commands
      .filter((command) => command.path[0] === group)
      .map((command) => `  ${command.path.join(' ').padEnd(30)} ${command.summary}`),
    '',
    `Run \`${NAME} ${group} <command> --help\` for details.`,
  ].join('\n');

const mainHelp = () =>
  [
    `Usage: ${NAME} <group> <command> [args] [flags]`,
    '',
    'Does everything the UT Dining dashboard does, from the command line, with the service key.',
    '',
    'Groups:',
    ...Object.entries(GROUPS).map(([group, text]) => `  ${group.padEnd(16)} ${text}`),
    '',
    GLOBAL_HELP,
    '',
    `Run \`${NAME} <group>\` to list its commands. \`${NAME} help --json\` prints every command as JSON.`,
  ].join('\n');

const catalog = () =>
  commands.map((command) => ({
    command: command.path.join(' '),
    summary: command.summary,
    usage: `${NAME} ${command.usage}`,
    details: command.details,
    options: Object.keys(command.options ?? {}),
    writes: Boolean(command.write),
    examples: command.examples?.map((example) => `${NAME} ${example}`),
  }));

const writes = (command: Command, opts: Options) => {
  if (!command.write) return false;
  if (command.path[0] === 'notifications' && ['send', 'schedule'].includes(command.path[1])) {
    return Boolean(opts.send);
  }
  return true;
};

const confirmProd = async (opts: Options, command: Command) => {
  if (opts['confirm-prod'] === PROD_REF) return;
  if (opts['confirm-prod'] !== undefined) {
    throw new CliError(`--confirm-prod must be the production ref ${PROD_REF}.`);
  }
  if (!process.stdin.isTTY || opts.json) {
    throw new CliError(
      `\`${command.path.join(' ')}\` writes to PRODUCTION. Add --confirm-prod ${PROD_REF} after Ethan has approved it, or use --dry-run.`,
    );
  }
  const prompt = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await prompt.question(`This writes to PRODUCTION. Type ${PROD_REF} to continue: `);
  prompt.close();
  if (answer.trim() !== PROD_REF) throw new CliError('Cancelled.');
};

export const main = async (argv: string[]) => {
  const loose = parseArgs({
    args: argv,
    options: GLOBAL_OPTIONS,
    strict: false,
    allowPositionals: true,
  });
  const json = Boolean(loose.values.json);
  let target: Target | null = null;
  let dryRun = false;
  const out = createOutput(json, () => ({ target: target?.name ?? null, dryRun }));

  try {
    const positionals = loose.positionals;
    if (positionals[0] === 'help' || positionals.length === 0) {
      out.result(catalog(), mainHelp);
      return 0;
    }
    const found = findCommand(positionals);
    if (!found) {
      if (GROUPS[positionals[0]] && positionals.length === 1) {
        out.result(
          catalog().filter((entry) => entry.command.startsWith(`${positionals[0]} `)),
          () => groupHelp(positionals[0]),
        );
        return 0;
      }
      throw new CliError(`Unknown command "${positionals.join(' ')}". Run \`${NAME} help\`.`, 2);
    }
    const { command } = found;
    if (loose.values.help) {
      out.result(
        catalog().find((entry) => entry.command === command.path.join(' ')),
        () => commandHelp(command),
      );
      return 0;
    }
    let parsed: ReturnType<typeof parseArgs>;
    try {
      parsed = parseArgs({
        args: argv,
        options: { ...GLOBAL_OPTIONS, ...command.options },
        strict: true,
        allowPositionals: true,
      });
    } catch (error) {
      throw new CliError(`${(error as Error).message}\n\n${commandHelp(command)}`, 2);
    }
    const opts = parsed.values as Options;
    const args = parsed.positionals.slice(command.path.length);
    dryRun = Boolean(opts['dry-run']);
    target = resolveTarget(opts as { local?: boolean; dev?: boolean; prod?: boolean });
    const db = connect(target);
    await authenticate(db, target);
    if (target.name === 'prod' && !dryRun && writes(command, opts))
      await confirmProd(opts, command);
    if (!json && target.name !== 'dev' && command.path[0] !== 'status')
      out.note(`Target: ${describeTarget(target)}`);
    await command.run({ db, target, out, dryRun }, args, opts);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof CliError ? error.exitCode : 1;
    if (json) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, target: target?.name ?? null, error: message }, null, 2)}\n`,
      );
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    return code;
  }
};

process.exitCode = await main(process.argv.slice(2));
