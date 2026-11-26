import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { buildMenuDays } from './e2e-fixtures.ts';

const root = join(import.meta.dirname, '../..');

const status = Object.fromEntries(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\n')
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => [match[1], match[2]]),
);

const url = status.API_URL;
const key = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;

if (!url?.startsWith('http://127.0.0.1:')) {
  throw new Error(`API_URL is '${url}', not a local address. Refusing to write fixtures.`);
}

const days = buildMenuDays();
const response = await fetch(`${url}/rest/v1/rpc/insert_multiple_locations_and_menus`, {
  method: 'POST',
  headers: {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ arg_data_array: days }),
});

if (!response.ok) {
  throw new Error(`Loading fixtures failed: ${response.status} ${await response.text()}`);
}

console.log(`Loaded ${days.length} fixture days for ${days[0].locationName} into ${url}`);
