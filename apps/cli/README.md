# @ut-dining/cli

A command line version of the admin dashboard, built for agents. It does everything `apps/dashboard` does: locations, hours, meal times, force close, list order, the About text, Help & Support links, credits, the changelog, and push notifications. It also covers a few things the dashboard doesn't: the required app version, and read-only views of scraped menus and categories.

```sh
pnpm -s admin                      # groups and global flags
pnpm -s admin locations            # commands in a group
pnpm -s admin locations set-hours --help
pnpm -s admin help --json          # every command, as JSON
make admin ARGS="changelog list"   # same thing through make
```

Use `pnpm -s` (silent). Without it pnpm prints a banner on stdout, which breaks `--json` parsing.

## Targets and keys

The CLI signs in with a Supabase service key from the environment. It never stores or prints a key, and it has no key built in.

| Flag | Project | Env vars |
|---|---|---|
| `--dev` (default) | hosted dev, `bdnlfwyfgvaployvrivk` | `SUPABASE_DEV_URL`, `SUPABASE_DEV_SERVICE_KEY` |
| `--local` | local Supabase from `make db-up` | none, read from `supabase status` |
| `--prod` | production, `yrmylgizphirqqkzgbth` | `SUPABASE_PROD_URL`, `SUPABASE_PROD_SERVICE_KEY` |

Every command checks the key before it does anything:

- An anon or publishable key is refused. Only a `service_role` JWT or an `sb_secret_` key works.
- A JWT key whose project ref doesn't match the URL is refused.
- The key must pass a real admin call (`auth.admin.listUsers`). If it fails, nothing runs.
- `--dev` and `--local` refuse any URL that contains the production ref.
- `--prod` refuses a URL that doesn't contain the production ref.

`pnpm -s admin status` shows which project you are on, whether the key worked, and row counts.

## Safety

- `--dry-run` works on every write. It prints what would change, before and after, and writes nothing.
- Writes to production need `--prod` and `--confirm-prod yrmylgizphirqqkzgbth`. In a terminal you can type the ref at the prompt instead. Reads on production only need `--prod`.
- Deletes, removals and `config set-app-version` also need `--yes`.
- Push notifications reach real phones, so `notifications send` and `notifications schedule` only preview unless you pass `--send`. `send` also needs `--confirm-devices <n>` with the device count from the preview, so it can't go out without a preview first.

**Agents: always ask Ethan before any production write, and before sending or scheduling any push notification on any target. Show him the exact command (and for a push, the title and body) and wait for his OK. Use `--dry-run` to show the change.**

## Output

Human-readable tables by default. With `--json`, stdout holds exactly one JSON object:

```json
{ "ok": true, "target": "dev", "dryRun": false, "data": { } }
{ "ok": false, "target": "dev", "error": "No location matches \"j3\"." }
```

The exit code is 0 on success, 1 on an error and 2 on a usage error. Notes such as `Target: local (...)` go to stderr.

## Common tasks

```sh
pnpm -s admin locations list
pnpm -s admin locations hours j2
pnpm -s admin locations set-hours j2 --days weekdays --ranges 07:00-14:00,16:30-21:00
pnpm -s admin locations set-hours "Jester City Market" --days sat,sun --closed
pnpm -s admin locations close kins
pnpm -s admin locations open kins
pnpm -s admin locations update j2 --set description="Open late during finals"
pnpm -s admin locations set-meal-times j2 --meal Breakfast=07:00-10:30 --meal Lunch=10:30-14:00
pnpm -s admin locations move "Jester City Market" --to 2

pnpm -s admin config show
pnpm -s admin support-links update "privacy policy" --url https://utdining.app/privacy-policy/
pnpm -s admin credits add --name "New Contributor"

pnpm -s admin changelog upsert 2.0.0 --summary "A fresh look" \
  --change "palette|New design|Every screen was redrawn." --change "zap|Faster menus"
pnpm -s admin changelog publish 2.0.0

pnpm -s admin notifications send --title "J2 is closed" --body "Closed today for maintenance." --type "Location Update"
pnpm -s admin notifications schedule --at "2026-12-01 09:00" --title "..." --body "..." --type "System Announcement"
pnpm -s admin notifications scheduled
pnpm -s admin notifications cancel <id>

pnpm -s admin menus list --location j2 --date 2026-12-01
pnpm -s admin menus categories --location j2 --menu Lunch
```

`<location>` is an id, a name, a colloquial name, or a unique part of one (`j2`, `jester city`, `kins`). Times read as `07:00`, `0700`, `7am` or `2:30pm`. Schedule times without an offset are Central time.

## How it maps to the dashboard

| Dashboard | CLI |
|---|---|
| Locations table, add/edit modal, force close switch, drag to reorder, delete | `locations list/get/create/update/set-hours/set-meal-times/close/open/move/delete`, `locations types` |
| Configuration: About, Credits, Help & Support | `config show/set-about`, `credits ...`, `support-links ...` |
| Changelog | `changelog list/get/upsert/publish/unpublish/delete/icons` |
| Notifications: send now, schedule, scheduled list | `notifications send/schedule/scheduled/cancel/history/types` |

Menus, categories and food items are written by the scraper every day, so the CLI only reads them.

`notifications send` calls the `manual-push-notification` edge function, like the dashboard. The function accepts the dashboard admin's session or the project's service role key. The service-key path has to be deployed (`supabase functions deploy manual-push-notification`) to each project before `send` works there.

## Development

Plain ESM TypeScript run by Node, with no build step. `pnpm --filter @ut-dining/cli test` runs the unit tests and `pnpm --filter @ut-dining/cli typecheck` runs the typecheck. Try commands against `--local` first: `make db-up` and, for menus, `make db-fixtures`.
