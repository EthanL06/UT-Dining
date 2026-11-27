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
4. Open the PR with REST (`gh api repos/EthanL06/UT-Dining/pulls -X POST -f base=staging ...`), conventional title, no AI attribution in the body. UI changes embed screenshots inline (see Screenshots).
5. Check it is mergeable before you wait for CI: a PR with a merge conflict gets no `pull_request` workflow runs at all. `gh api repos/EthanL06/UT-Dining/pulls/<n> --jq .mergeable_state`; if `dirty`, merge `origin/staging` into the branch and push (never force-push).
6. Ask Ethan before merging, each PR. Once he says yes, merge it yourself; don't leave it for him to click.
   - Squash merge with a hand-written message (what changed and why, no trailers): `gh api -X PUT repos/EthanL06/UT-Dining/pulls/<n>/merge -f merge_method=squash -f sha=<head sha> -f commit_title='<title> (#<n>)' -f commit_message='<body>'`. If that is refused, `PUT pulls/<n>/merge-async` with the full `expected_head_sha` works.
   - A draft PR: `POST repos/EthanL06/UT-Dining/pulls/<n>/ccr/ready_for_review` first.
   - When the Vercel deploy cap is hit, ignore the Vercel checks for the merge decision.
7. After the merge, merge `staging` into every other open PR that touches the same files, so they stay mergeable and CI keeps running.
8. `Fixes #N` does not close issues on `staging`. Close them by hand with `state_reason=completed`.
9. Only Ethan promotes `staging` to `main` (a merge commit, the one exception to squash).

## Mobile: OTA update or new build

Decide with one question: did the iOS fingerprint change? It changes with native dependencies, config plugins, native parts of `app.config.js` or `eas.json`, and the `DEV_UPDATES` value. `apps/mobile/AGENTS.md` (Dev app, PR previews and OTA updates) has the details.

- JS-only change: no build. Merging to `staging` publishes an OTA update to channel `staging`; a PR publishes to `pr-<n>` with a QR code comment. Ethan tests it in the installed **UT Dining (Dev)** app (QA Menu > Load PR Preview, then Back to Staging).
- Fingerprint changed: `mobile-preview.yml` starts an EAS `preview` build with `--no-wait` and links it. The free plan has 15 iOS builds a month, so don't start extra builds by hand, and tell Ethan when he needs to install a new build.
- App Store releases (`production` profile, channel `production`) happen only from `main` through `release.yml`, gated by the `app-store` environment. Never publish an update to `production` from a branch.

## Database migrations

- Write: `make db-new NAME=<name>`, keep it backwards compatible, `make db-reset`, `make db-types`, `make db-check`. Never edit a migration that is already on `staging`.
- Dev (hosted `ut-dining-dev`, ref `bdnlfwyfgvaployvrivk`): Ethan has given standing permission to apply migrations here without asking. `supabase link --project-ref bdnlfwyfgvaployvrivk`, then `supabase db push --dry-run`, read the list, then `supabase db push`. It needs `SUPABASE_ACCESS_TOKEN` or the database password; if the cloud environment has neither, run it through a Remote Control session on Ethan's Mac.
- Production (ref `yrmylgizphirqqkzgbth`): needs Ethan's OK for each change. Show him `supabase db push --dry-run` against the prod link (the exact list of migrations), wait for his yes, apply in timestamp order, then check the app and dashboard still load. Prod migrations go in before the code that needs them reaches `main`; pending ones are listed in PR #25.

## Production data changes

1. Do it on dev first: `pnpm -s admin <group> <command> --dev`, check the result in the app or dashboard.
2. Preview prod: same command with `--prod --dry-run`. Paste the full before/after output to Ethan.
3. Wait for his OK, then run it with `--prod --confirm-prod yrmylgizphirqqkzgbth`.
4. Re-read the rows (`--prod --json`) and confirm the change. The App Store app picks up location data on its next 6-hour refresh or pull to refresh; no release needed.
- Many commands: put them in one script with `TARGET` and `DRY` variables, run it with `--dry-run` on prod, show Ethan the whole output, then run it for real.
- Push notifications reach real phones on every target: show the exact title and body and get Ethan's OK before `--send`.
- Never test against prod. If the `SUPABASE_PROD_*` variables are missing, say so; don't look for keys elsewhere.

## Screenshots

- iOS app: Ethan's Mac Simulator first, through a Remote Control session (`make screenshots SIM=<UDID>`, light and dark). Use your own simulator clone and shut down only what you booted. The `screenshots` PR label (CI, about 30 to 60 minutes) is the fallback when the Mac is offline.
- Web: take them in the container (agent-browser with the preinstalled Chromium).
- Push the PNGs to an orphan `assets/<topic>` branch with both `vercel.json` files (`.agents/recipes/cloud-sessions.md` has the commands) and embed every image inline in the PR body with its `raw.githubusercontent.com` URL. No links to an index or a "full set".
- Before claiming a visual change, check the current state first; it may already look that way.

## Local test data

- Agents test against local Supabase, never dev or prod. `make db-up`, then `make db-fresh`: the schema, the locations in `supabase/seed.sql`, and sample menus and places with the known edge cases, in about 40 s with no network. `SAMPLE_TODAY=YYYY-MM-DD` pins the date.
- Hit an edge case the sample data lacks? Add it to `scripts/dev/sample/data.json` and its README table in the same PR.
- Real menus: `make db-seed DAYS=3` scrapes UT's site into the local database. The fixed E2E menus: `make db-fixtures`.

## Production cutover (2.0.0)

- Before the `staging` to `main` merge: the checklist in PR #25 (prod migrations in order, prod Auth URLs, support links, the App Store release, the website move). Each prod step needs Ethan's OK.
- After the merge: issue #64 (Email sign-in off, one `manual-push-notification` deploy to prod, suspend the Render cron before the next 07:00 UTC, check Vercel production builds, `status.utdining.app/api/status`, ruleset and Renovate steps).
- Tick the boxes on #25 and #64 as steps are done, and add any new prod step to them rather than to chat.
