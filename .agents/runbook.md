# Runbook

Step-by-step flows that come up again and again. `AGENTS.md` has the rules; this file has the order of operations. Recipes in `.agents/recipes/` cover one-off gotchas.

## Keep this file current

This runbook is only useful while it matches reality, so keeping it current is part of the task, not a follow-up:

- When you change how one of these flows works (a script, a workflow, a Makefile target, a permission), update the matching section **in the same PR**.
- When you find that a step here is wrong, out of date or missing (a command fails, a step was skipped in practice, Ethan gives a new rule), fix it in the PR you are working on. If that PR is unrelated, open a small docs-only PR for it; docs-only PRs skip the heavy CI jobs and merge in minutes.
- When you do something twice that is not written down here, add a section.
- Write steps as commands to run and checks to make. Leave out history and who did what; `git log` has that.

## Pull requests and merging

1. Branch from `origin/staging` (`make worktree NAME=<type>-<slug>` or `git switch -c <type>-<slug> origin/staging`).
2. One independent PR per change, based on `staging`. Do not stack PRs: a cloud session cannot merge or retarget a stacked PR (GraphQL is blocked and `gh stack` needs it). Stack only when Ethan asks, and run `gh stack` on his Mac with `--base staging`.
3. Before you push: `make verify`, then let the pre-push hook run.
4. Open the PR with REST (`gh api repos/EthanL06/UT-Dining/pulls -X POST -f base=staging ...`), conventional title, no AI attribution in the body. Then `make pr-setup PR=<n> THREAD=<project thread URL> LABELS="<labels>"`: it adds the attribution lines, assigns Ethan, requests his review and adds the labels. UI changes embed screenshots inline: `IMAGES=<dir>` uploads a folder of PNGs and embeds them (see Screenshots).
5. `make pr-ready PR=<n>`: waits for GitHub's mergeability, merges `staging` in when the branch is behind (update-branch API, a merge commit), waits for the required checks ("Lint, typecheck, test", "Conventional PR title"), ignores Vercel failures, and ends with GREEN or RED plus the log tail of each failed job. On a conflict it lists the files both sides changed; merge `origin/staging` into the branch by hand and push (never force-push), because a conflicted PR gets no `pull_request` workflow runs at all. Exit codes: 0 green, 1 red, 3 still running.
6. Ask Ethan before merging, each PR. Once he says yes, merge it yourself; don't leave it for him to click.
   - Squash merge with a hand-written message (what changed and why, no trailers): `make merge-pr PR=<n> TITLE='<title>' BODY_FILE=<file>`, which checks the base, draft state, conflicts and attribution first. Without the Makefile: `gh api -X PUT repos/EthanL06/UT-Dining/pulls/<n>/merge -f merge_method=squash -f sha=<head sha> -f commit_title='<title> (#<n>)' -f commit_message='<body>'`. If that is refused, `PUT pulls/<n>/merge-async` with the full `expected_head_sha` works.
   - A draft PR: `POST repos/EthanL06/UT-Dining/pulls/<n>/ccr/ready_for_review` first.
   - When the Vercel deploy cap is hit, ignore the Vercel checks for the merge decision.
7. After the merge, `make update-prs` merges `staging` into every other open PR that touches the same files, so they stay mergeable and CI keeps running. The "Update open PRs" workflow does the same on every push to `staging` once the `PR_UPDATE_TOKEN` secret exists (a fine-grained token of Ethan's with Contents and Pull requests write on this repo; updates made with the default `GITHUB_TOKEN` don't start CI). Without the secret it only reports. Conflicted PRs are listed, not touched.
8. For an app change, `make ota-check PR=<n>` follows the staging OTA update until it is live and prints the update page, or says the merge doesn't touch the app. It warns when native code changed and Ethan has to install a new dev build.
9. `Fixes #N` does not close issues on `staging`. Close them by hand with `state_reason=completed`.
10. Only Ethan promotes `staging` to `main` (a merge commit, the one exception to squash).

## Status and cleanup

- `make status`: every open PR with its CI and merge state, sorted into what waits on Ethan (green PRs to approve, review requests, cutover boxes, issues with open checklists), what needs an agent (conflicts, red CI) and what is still running, plus the latest run of each workflow on `staging`. About 40 s. `ARGS=--json` for machine output.
- `make cleanup` lists merged branches (remote and local), worktrees with nothing unpushed, and stale simulator clones; `make cleanup YES=1` deletes them. Remote branches with no PR are only listed. The weekly `branch-cleanup.yml` sweep does the remote part on Mondays.

## Mobile: OTA update or new build

Decide with one question: did the iOS fingerprint change? It changes with native dependencies, config plugins, native parts of `app.config.js` or `eas.json`, and the `DEV_UPDATES` value. `apps/mobile/AGENTS.md` (Dev app, PR previews and OTA updates) has the details.

- JS-only change: no build. Merging to `staging` publishes an OTA update to channel `staging`; a PR publishes to `pr-<n>` with a QR code comment. Ethan tests it in the installed **UT Dining (Dev)** app (QA Menu > Load PR Preview, then Back to Staging).
- Fingerprint changed: `mobile-preview.yml` starts an EAS `preview` build with `--no-wait` and links it. The free plan has 15 iOS builds a month, so don't start extra builds by hand, and tell Ethan when he needs to install a new build.
- App Store releases (`production` profile, channel `production`) happen only from `main` through `release.yml`, gated by the `app-store` environment. Never publish an update to `production` from a branch.

## Database migrations

- Write: `make db-new NAME=<name>`, keep it backwards compatible, `make db-reset`, `make db-types`, `make db-check`. Never edit a migration that is already on `staging`.
- Dev (hosted `ut-dining-dev`, ref `bdnlfwyfgvaployvrivk`): Ethan has given standing permission to apply migrations here without asking. `supabase link --project-ref bdnlfwyfgvaployvrivk`, then `supabase db push --dry-run`, read the list, then `supabase db push`. It needs `SUPABASE_ACCESS_TOKEN` or the database password; if the cloud environment has neither, run it through a Remote Control session on Ethan's Mac.
- Production (ref `yrmylgizphirqqkzgbth`): needs Ethan's OK for each change. Show him `supabase db push --dry-run` against the prod link (the exact list of migrations), wait for his yes, apply in timestamp order, then check the app and dashboard still load. Prod migrations go in before the code that needs them reaches `main`; pending ones are listed in PR #25.

## Database size and menu retention

- Free plan limit is 500 MB. Almost all of it is menu history (`nutrition`, `food_item`, `allergens`). Check the size in the Supabase SQL editor with `select pg_size_pretty(pg_database_size(current_database()))`.
- The scraper deletes menus older than the `MENU_RETENTION_DAYS` repo variable (90, Ethan's choice on 2026-11-27) after each run; `DEV_MENU_RETENTION_DAYS` does the same for `scraper-dev.yml`. Unset means no pruning. Set the prod variable only once the open data export has the full history in the repo. The export (EthanL06/ut-dining-data) is the archive: if it stops committing for more than about 80 days, unset `MENU_RETENTION_DAYS` until it catches up, so no unarchived day is pruned.
- Deleted rows free space for reuse but do not shrink the reported size. After a large one-time prune, run `VACUUM FULL nutrition, food_item, allergens, menu_category, menu;` in the SQL editor (prod needs Ethan's OK). It locks those tables for a few seconds, so run it outside meal times.

## Production data changes

1. Do it on dev first: `pnpm -s admin <group> <command> --dev`, check the result in the app or dashboard.
2. Preview prod: same command with `--prod --dry-run`. Paste the full before/after output to Ethan.
3. Wait for his OK, then run it with `--prod --confirm-prod yrmylgizphirqqkzgbth`.
4. Re-read the rows (`--prod --json`) and confirm the change. The App Store app picks up location data on its next 6-hour refresh or pull to refresh; no release needed.
- Many commands: write them to a plan file, one admin command per line without the target flags (`locations set-hours "Wendy's" --days all --ranges 00:00-04:00,10:00-23:59`). `make data-change PLAN=<file> TARGET=dev` backs up the admin tables, then dry-runs every command; `APPLY=1` runs them and reads the tables back into `changes.md` (every changed field). For prod: `TARGET=prod` dry run, show Ethan the output, then after his OK `TARGET=prod APPLY=1 CONFIRM=yrmylgizphirqqkzgbth`. Backups and reports land in `.context/data-changes/<plan>/<time>-<target>/` (`before.json` is the rollback source). Push notifications are refused in a plan.
- Push notifications reach real phones on every target: show the exact title and body and get Ethan's OK before `--send`.
- Never test against prod. If the `SUPABASE_PROD_*` variables are missing, say so; don't look for keys elsewhere.

## Screenshots

- iOS app: Ethan's Mac first, through a Remote Control session in the PR's worktree: `make pr-screenshots PR=<n> SCREENS="home map"`. It leases its own simulator clone (never one of Ethan's), takes light and dark, pushes them and embeds them inline in the PR body. It falls back to the `screenshots` PR label (CI, about 30 to 60 minutes, also embeds) by itself when the Mac is busy; from a cloud session when the Mac is offline, run `scripts/qa/pr-screenshots.sh <n> --ci`. For other simulator work, `make sim-lease OWNER=<thread>` and `make sim-release SIM=<UDID>`. Shut down every simulator you are no longer using (Ethan, 2026-11-27): release your lease when done and run `make sims-idle` before you finish. The launchd sweeper (`make sim-sweeper`; `ARGS=status` checks it) catches what a crashed or offline session leaves behind: every 5 minutes it shuts down simulators idle for 20 minutes. If `ARGS=status` says it is not installed, install it.
- Web: take them in the container (agent-browser with the preinstalled Chromium).
- Web or any other images: `make pr-setup PR=<n> IMAGES=<dir>` pushes them to `assets/pr-<n>` and embeds each inline. iOS shots from `make pr-screenshots` get their own light and dark table, so the two sections live side by side. Every image inline in the PR body, never a link to an index or a "full set".
- Before claiming a visual change, check the current state first; it may already look that way.

## Local test data

- Agents test against local Supabase, never dev or prod. `make db-up`, then `make db-fresh`: the schema, the locations in `supabase/seed.sql`, and sample menus and places with the known edge cases, in about 40 s with no network. `SAMPLE_TODAY=YYYY-MM-DD` pins the date.
- Hit an edge case the sample data lacks? Add it to `scripts/dev/sample/data.json` and its README table in the same PR.
- Real menus: `make db-seed DAYS=3` scrapes UT's site into the local database. The fixed E2E menus: `make db-fixtures`.

## Production cutover (2.0.0)

- Before the `staging` to `main` merge: the checklist in PR #25 (prod migrations in order, prod Auth URLs, support links, the App Store release, the website move). Each prod step needs Ethan's OK.
- After the merge: issue #64 (Email sign-in off, one `manual-push-notification` deploy to prod, suspend the Render cron before the next 07:00 UTC, check Vercel production builds, `status.utdining.app/api/status`, ruleset and Renovate steps).
- `make cutover` lists the steps of both and runs the read-only checks (site pages, the App Store version, `/api/status`, the dashboard). `make cutover ARGS="--run <step>"` dry-runs one prod step (`supabase db push --dry-run`, admin `--dry-run`). Only with Ethan's OK for that step: `ARGS="--run <step> --confirm-prod yrmylgizphirqqkzgbth"`, which also asks for the step id to be typed in a terminal, so it can't run unattended. Run prod steps on the Mac.
- Tick the boxes on #25 and #64 as steps are done, and add any new prod step to them and to `scripts/dev/ops/cutover.ts` rather than to chat.
