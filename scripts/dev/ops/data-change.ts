import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { DEV_REF, PROD_REF, say } from './github.ts';

const USAGE = `Usage: make data-change PLAN=<file> [TARGET=local|dev|prod] [APPLY=1] [CONFIRM=${PROD_REF}]
       node scripts/dev/ops/data-change.ts <plan file> [--target local|dev|prod] [--apply]
                                           [--confirm-prod ${PROD_REF}]

Runs a list of admin CLI commands (apps/cli) as one data change, with a backup and a read back:
  1. Backs up the admin tables (location, location_type, app_information, changelog,
     notification_types, notifications) to .context/data-changes/<plan>/<time>-<target>/before.json.
  2. Dry run: every command with --dry-run, stopping at the first error. This is the default and
     is what to show Ethan before a prod change.
  3. With --apply (prod also needs --confirm-prod ${PROD_REF}): runs every command for real,
     stopping at the first error.
  4. Reads the tables back into after.json and writes changes.md: every inserted, deleted and
     changed row with the fields that changed.

The plan file has one command per line, written as after "pnpm -s admin" (for example
  locations set-hours "Wendy's" --days all --ranges 00:00-04:00,10:00-23:59
). Blank lines and lines starting with # are skipped. Leave out --dev, --prod, --local, --dry-run
and --confirm-prod; the runner adds them. Push notifications (notifications send, schedule) are
refused: they reach real phones and have their own flow in the runbook.`;

const TABLES = [
  'location',
  'location_type',
  'app_information',
  'changelog',
  'notification_types',
  'notifications',
];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    target: { type: 'string', default: 'dev' },
    apply: { type: 'boolean', default: false },
    'confirm-prod': { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help || !positionals[0]) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 2);
}
const planPath = positionals[0];
const target = values.target;
if (target !== 'local' && target !== 'dev' && target !== 'prod')
  say.die(`--target must be local, dev or prod, not ${target}`, 2);
if (values.apply && target === 'prod' && values['confirm-prod'] !== PROD_REF)
  say.die(
    `Applying to prod needs --confirm-prod ${PROD_REF}, after Ethan said yes to the dry run.`,
    2,
  );

const root = join(import.meta.dirname, '..', '..', '..');

const splitCommand = (line: string): string[] => {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let i = 0; i < line.length; i++) {
    const char = line.charAt(i);
    if (quote) {
      if (char === quote) quote = null;
      else if (char === '\\' && quote === '"' && i + 1 < line.length) current += line.charAt(++i);
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (char === '\\' && i + 1 < line.length) {
      current += line.charAt(++i);
      started = true;
    } else if (/\s/.test(char)) {
      if (started) args.push(current);
      current = '';
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (quote) throw new Error(`unclosed ${quote} in: ${line}`);
  if (started) args.push(current);
  return args;
};

const RESERVED = new Set(['--dev', '--prod', '--local', '--dry-run', '--confirm-prod', '--json']);

const readPlan = (): string[][] => {
  const commands = readFileSync(planPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(splitCommand);
  if (commands.length === 0) say.die(`${planPath} has no commands`);
  for (const args of commands) {
    const reserved = args.find((arg) => RESERVED.has(arg));
    if (reserved)
      say.die(`leave ${reserved} out of the plan, the runner adds it: ${args.join(' ')}`);
    if (args[0] === 'notifications' && ['send', 'schedule', 'cancel'].includes(args[1] ?? ''))
      say.die('push notifications are not allowed in a data change plan (see the runbook)');
  }
  return commands;
};

const credentials = (): { url: string; key: string } => {
  if (target === 'local') {
    const output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const env = Object.fromEntries(
      output
        .split('\n')
        .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim()))
        .filter((match): match is RegExpExecArray => match !== null)
        .map((match) => [match[1], match[2]]),
    );
    const url = env.API_URL;
    const key = env.SERVICE_ROLE_KEY ?? env.SECRET_KEY;
    if (!url || !key) return say.die('local Supabase is not running (make db-up)');
    return { url, key };
  }
  const prefix = target === 'dev' ? 'SUPABASE_DEV' : 'SUPABASE_PROD';
  const url = process.env[`${prefix}_URL`];
  const key = process.env[`${prefix}_SERVICE_KEY`];
  if (!url || !key) return say.die(`${prefix}_URL and ${prefix}_SERVICE_KEY must be set`);
  const ref = target === 'dev' ? DEV_REF : PROD_REF;
  if (!url.includes(ref)) say.die(`${prefix}_URL does not point at the ${target} project ${ref}`);
  if (target === 'dev' && url.includes(PROD_REF)) say.die('the dev URL points at prod');
  return { url, key };
};

type Row = Record<string, unknown>;
type Snapshot = Record<string, Row[]>;

const snapshot = async (): Promise<Snapshot> => {
  const { url, key } = credentials();
  const result: Snapshot = {};
  for (const table of TABLES) {
    const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    if (!response.ok)
      say.die(`could not read ${table}: HTTP ${response.status} ${await response.text()}`);
    result[table] = (await response.json()) as Row[];
  }
  return result;
};

const rowKey = (row: Row) =>
  String(row.id ?? row.version ?? row.name ?? row.type ?? JSON.stringify(row));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const show = (value: unknown) => {
  const text = JSON.stringify(value) ?? 'undefined';
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const diff = (before: Snapshot, after: Snapshot): string[] => {
  const lines: string[] = [];
  for (const table of TABLES) {
    const old = new Map((before[table] ?? []).map((row) => [rowKey(row), row]));
    const now = new Map((after[table] ?? []).map((row) => [rowKey(row), row]));
    const label = (row: Row) =>
      `${table} ${String(row.name ?? row.version ?? row.title ?? rowKey(row))}`;
    for (const [key, row] of now) {
      const prior = old.get(key);
      if (!prior) {
        lines.push(`- added ${label(row)}`);
        continue;
      }
      const fields = Object.keys({ ...prior, ...row }).filter(
        (field) => field !== 'updated_at' && !same(prior[field], row[field]),
      );
      for (const field of fields)
        lines.push(`- ${label(row)}: ${field} ${show(prior[field])} -> ${show(row[field])}`);
    }
    for (const [key, row] of old) if (!now.has(key)) lines.push(`- removed ${label(row)}`);
  }
  return lines;
};

const runAdmin = (args: string[], dryRun: boolean) => {
  const extra = [`--${target}`];
  if (dryRun) extra.push('--dry-run');
  else if (target === 'prod') extra.push('--confirm-prod', PROD_REF);
  console.log(
    `+ admin ${args.map((arg) => (/[\s"'$]/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')} ${extra.join(' ')}`,
  );
  const run = spawnSync('pnpm', ['-s', 'admin', ...args, ...extra], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  return run.status === 0;
};

const main = async () => {
  const commands = readPlan();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(
    root,
    '.context',
    'data-changes',
    basename(planPath, extname(planPath)),
    `${stamp}-${target}`,
  );
  mkdirSync(dir, { recursive: true });

  say.step(`Backup of ${target}`);
  const before = await snapshot();
  writeFileSync(join(dir, 'before.json'), `${JSON.stringify(before, null, 2)}\n`);
  say.ok(
    `${relative(root, dir)}/before.json (${TABLES.map((t) => `${before[t]?.length ?? 0} ${t}`).join(', ')})`,
  );

  say.step(`Dry run on ${target} (${commands.length} command(s))`);
  for (const [index, args] of commands.entries()) {
    if (!runAdmin(args, true))
      say.die(`dry run failed at command ${index + 1}; nothing was written`);
  }
  if (!values.apply) {
    say.ok('dry run passed, nothing was written');
    const next =
      target === 'prod'
        ? `Show Ethan the output above. After his OK: make data-change PLAN=${planPath} TARGET=prod APPLY=1 CONFIRM=${PROD_REF}`
        : `Apply it: make data-change PLAN=${planPath} TARGET=${target} APPLY=1`;
    say.note(next);
    return;
  }

  say.step(`Applying to ${target}`);
  let failedAt = 0;
  for (const [index, args] of commands.entries()) {
    if (!runAdmin(args, false)) {
      failedAt = index + 1;
      say.bad(
        `command ${index + 1} failed; commands 1 to ${index} were applied, the rest were not`,
      );
      break;
    }
  }

  say.step('Read back');
  const after = await snapshot();
  writeFileSync(join(dir, 'after.json'), `${JSON.stringify(after, null, 2)}\n`);
  const changes = diff(before, after);
  const report = [
    `# Data change ${basename(planPath)} on ${target}`,
    '',
    `${failedAt ? `Stopped at command ${failedAt}.` : `All ${commands.length} command(s) applied.`} Backup: before.json, read back: after.json.`,
    '',
    '## Commands',
    '',
    ...commands.map((args) => `- \`admin ${args.join(' ')}\``),
    '',
    '## What changed',
    '',
    ...(changes.length > 0 ? changes : ['- nothing']),
    '',
  ].join('\n');
  writeFileSync(join(dir, 'changes.md'), report);
  console.log(changes.length > 0 ? changes.join('\n') : '  no rows changed');
  say.ok(`${relative(root, dir)}/changes.md`);
  if (target === 'prod')
    say.note(
      'The App Store app picks up location data on its 6-hour refresh or a pull to refresh.',
    );
  if (failedAt) process.exit(1);
};

await main();
