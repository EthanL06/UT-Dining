import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@ut-dining/supabase';
import { CliError } from './output.ts';

export const DEV_REF = 'bdnlfwyfgvaployvrivk';
export const PROD_REF = 'yrmylgizphirqqkzgbth';

export type TargetName = 'local' | 'dev' | 'prod';

export interface Target {
  name: TargetName;
  url: string;
  serviceKey: string;
}

export type Db = SupabaseClient<Database>;

type Env = Record<string, string | undefined>;

const root = join(import.meta.dirname, '..', '..', '..');

export const parseEnvText = (text: string): Record<string, string> => {
  const values: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
  return values;
};

const readLocal = (): Target => {
  let output: string;
  try {
    output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new CliError('Local Supabase is not running. Start it with `make db-up`.');
  }
  const status = parseEnvText(output);
  const url = status.API_URL;
  const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
  if (!url || !serviceKey)
    throw new CliError('`supabase status` did not print API_URL and SERVICE_ROLE_KEY.');
  return { name: 'local', url, serviceKey };
};

const fromEnv = (name: 'dev' | 'prod', env: Env): Target => {
  const prefix = name === 'dev' ? 'SUPABASE_DEV' : 'SUPABASE_PROD';
  const url = env[`${prefix}_URL`];
  const serviceKey = env[`${prefix}_SERVICE_KEY`];
  const missing = [
    url ? null : `${prefix}_URL`,
    serviceKey ? null : `${prefix}_SERVICE_KEY`,
  ].filter(Boolean);
  if (missing.length > 0 || !url || !serviceKey) {
    const hint =
      name === 'dev'
        ? ' Add them to your shell or the cloud environment, or pass --local to use local Supabase.'
        : ' Production keys are never set by default. Ask Ethan.';
    throw new CliError(`Missing ${missing.join(' and ')}.${hint}`);
  }
  return { name, url, serviceKey };
};

export const checkTarget = (target: Target): Target => {
  const isProdUrl = target.url.includes(PROD_REF);
  if (target.name !== 'prod' && isProdUrl) {
    throw new CliError(
      `The ${target.name} target points at the production project (${PROD_REF}). Refusing. Use --prod for production.`,
    );
  }
  if (target.name === 'prod' && !isProdUrl) {
    throw new CliError(`SUPABASE_PROD_URL does not contain the production ref ${PROD_REF}.`);
  }
  return target;
};

const decodeJwt = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

export const projectRef = (url: string) =>
  url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null;

export const checkKey = (target: Target): Target => {
  const key = target.serviceKey.trim();
  const label =
    target.name === 'local'
      ? 'The local service key'
      : `SUPABASE_${target.name.toUpperCase()}_SERVICE_KEY`;
  if (key.startsWith('sb_publishable_')) {
    throw new CliError(
      `${label} is a publishable (anon) key. The CLI needs the service role or secret key.`,
    );
  }
  if (key.startsWith('sb_secret_')) return target;
  const claims = decodeJwt(key);
  if (!claims) throw new CliError(`${label} is not a Supabase key.`);
  if (claims.role !== 'service_role') {
    throw new CliError(
      `${label} has role "${String(claims.role)}". The CLI needs the service_role key, not the anon key.`,
    );
  }
  const ref = projectRef(target.url);
  if (ref && typeof claims.ref === 'string' && claims.ref !== ref) {
    throw new CliError(`${label} belongs to project ${claims.ref}, but the URL is project ${ref}.`);
  }
  return target;
};

export const authenticate = async (db: Db, target: Target) => {
  const { error } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    throw new CliError(
      `Supabase rejected the ${target.name} service key (${error.message}). Check the key, or that the project isn't paused.`,
    );
  }
};

export const resolveTarget = (
  flags: { local?: boolean; dev?: boolean; prod?: boolean },
  env: Env = process.env,
): Target => {
  const chosen = (['local', 'dev', 'prod'] as const).filter((name) => flags[name]);
  if (chosen.length > 1) throw new CliError('Pick one of --local, --dev or --prod.');
  const name = chosen[0] ?? 'dev';
  return checkKey(checkTarget(name === 'local' ? readLocal() : fromEnv(name, env)));
};

export const describeTarget = (target: Target) => {
  if (target.name === 'local') return `local (${target.url})`;
  const ref = target.url.match(/https?:\/\/([a-z0-9]+)\./)?.[1] ?? target.url;
  return `${target.name} (${ref})`;
};

export const connect = (target: Target): Db =>
  createClient<Database>(target.url, target.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
