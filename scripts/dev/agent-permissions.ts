import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

type Permissions = { allow?: string[]; deny?: string[]; [key: string]: unknown };
type Settings = { permissions?: Permissions; [key: string]: unknown };

export function mergePermissions(current: Settings, rules: Permissions): Settings {
  const permissions = { ...current.permissions };
  for (const key of ['allow', 'deny'] as const) {
    permissions[key] = [...new Set([...(permissions[key] ?? []), ...(rules[key] ?? [])])];
  }
  return { ...current, permissions };
}

function main() {
  const root = join(dirname(new URL(import.meta.url).pathname), '..', '..');
  const rules = JSON.parse(readFileSync(join(root, '.agents/agent-permissions.json'), 'utf8'))
    .permissions as Permissions;
  const target = process.argv[2] ?? join(homedir(), '.claude', 'settings.json');
  const check = process.argv.includes('--check');
  const current: Settings = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {};
  const merged = mergePermissions(current, rules);
  const added = (key: 'allow' | 'deny') =>
    (merged.permissions?.[key]?.length ?? 0) - (current.permissions?.[key]?.length ?? 0);
  if (check) {
    process.stdout.write(
      `${added('allow')} allow and ${added('deny')} deny rule(s) missing from ${target}\n`,
    );
    process.exit(added('allow') + added('deny') > 0 ? 1 : 0);
  }
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) copyFileSync(target, `${target}.bak`);
  writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`);
  process.stdout.write(
    `Added ${added('allow')} allow and ${added('deny')} deny rule(s) to ${target} (backup: ${target}.bak)\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
