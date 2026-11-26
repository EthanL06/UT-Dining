import { readFileSync } from 'node:fs';
import type { ParseArgsOptionsConfig } from 'node:util';
import { CliError, type Output } from './output.ts';
import type { Db, Target } from './target.ts';

export type Options = Record<string, string | boolean | string[] | undefined>;

export interface Context {
  db: Db;
  target: Target;
  out: Output;
  dryRun: boolean;
}

export interface Command {
  path: string[];
  summary: string;
  usage: string;
  details?: string;
  examples?: string[];
  options?: ParseArgsOptionsConfig;
  write?: boolean;
  run: (ctx: Context, args: string[], opts: Options) => Promise<void>;
}

export interface Plan {
  action: string;
  target?: string;
  before?: unknown;
  after?: unknown;
}

export const commit = async <T>(
  ctx: Context,
  plan: Plan,
  apply: () => Promise<T>,
  human?: (result: T | undefined) => string,
) => {
  if (ctx.dryRun) {
    ctx.out.result({ ...plan, applied: false }, () =>
      [
        `Dry run: ${plan.action}. Nothing was written.`,
        plan.before === undefined ? '' : `Before:\n${JSON.stringify(plan.before, null, 2)}`,
        plan.after === undefined ? '' : `After:\n${JSON.stringify(plan.after, null, 2)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
    return;
  }
  const result = await apply();
  ctx.out.result({ ...plan, applied: true, result }, () =>
    human ? human(result) : `Done: ${plan.action}.`,
  );
};

export const check = <T>(response: {
  data: T;
  error: { message: string; code?: string } | null;
}): NonNullable<T> => {
  if (response.error) throw new CliError(`Supabase: ${response.error.message}`);
  if (response.data === null || response.data === undefined)
    throw new CliError('Supabase returned no data.');
  return response.data as NonNullable<T>;
};

export const checkMaybe = <T>(response: {
  data: T;
  error: { message: string; code?: string } | null;
}): T => {
  if (response.error) throw new CliError(`Supabase: ${response.error.message}`);
  return response.data;
};

export const str = (opts: Options, name: string): string | undefined => {
  const value = opts[name];
  return typeof value === 'string' ? value : undefined;
};

export const list = (opts: Options, name: string): string[] => {
  const value = opts[name];
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
};

export const required = (opts: Options, name: string): string => {
  const value = str(opts, name);
  if (value === undefined || value.trim() === '') throw new CliError(`--${name} is required.`);
  return value;
};

export const arg = (args: string[], index: number, name: string): string => {
  const value = args[index];
  if (!value) throw new CliError(`Missing <${name}>.`);
  return value;
};

export const readJson = (path: string): unknown => {
  const text = path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(
      `${path === '-' ? 'stdin' : path} is not valid JSON: ${(error as Error).message}`,
    );
  }
};

export const requireYes = (opts: Options, what: string) => {
  if (!opts.yes)
    throw new CliError(`${what} can't be undone. Add --yes to confirm, or --dry-run to preview.`);
};
