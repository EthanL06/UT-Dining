SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

DEV := scripts/dev
ARGS ?=
NAME ?=
SIM ?=
PR ?=
SCREENS ?=
OWNER ?=
TITLE ?=
BODY_FILE ?=
DAYS ?= 3
export DB SEED DAYS SIM FORCE METRO_PORT SUPABASE_EXCLUDE

.PHONY: help setup install doctor \
	dev mobile ios android dashboard website scrape places admin mobile-preview \
	db-up db-down db-status db-reset db-migrate db-new db-types db-check db-seed db-fixtures db-sample db-fresh db-psql db-studio \
	env-local env-dev \
	check verify pre-push check-staged check-comments check-size check-state check-unused functions fix lint typecheck test build \
	sim sims sim-lease sim-release sim-leases sims-idle sim-sweeper e2e e2e-fixtures screenshots pr-screenshots ios-app perf-build size-report \
	merge-pr agent-permissions \
	worktree worktree-rm worktrees \
	clean clean-metro clean-sims clean-worktrees clean-caches clean-deps stop

help:
	@printf '%s\n' \
	'UT Dining. Run any target from the repo root. Variables go after the target: make db-seed DAYS=5' \
	'' \
	'Setup' \
	'  setup           Everything: Node, pnpm, deps, env files, local Supabase, menu data. Safe to re-run.' \
	'                  DB=auto|local|dev|none picks the database. SEED=0 skips scraping menus.' \
	'  install         pnpm install with the lockfile' \
	'  doctor          Check tools, deps, env files, database and simulators. Exits 1 on problems.' \
	'' \
	'Run' \
	'  dev             Local Supabase (if the apps use it), then dashboard, website and Metro together' \
	'  mobile          Metro for the development build. ARGS=--tunnel for a phone on another network' \
	'  ios             Build and install the development build on a simulator. SIM=<name or UDID>' \
	'  android         Build and install the development build on Android' \
	'  dashboard       Dashboard on http://localhost:3000' \
	'  website         Website on http://localhost:3001' \
	'  scrape          Run the scraper once with apps/scraper/.env.local' \
	'  places          Sync UT-run restaurant, cafe and food truck hours (dry run unless ENABLE_SUPABASE=true)' \
	'  admin           Dashboard data CLI (dev by default). ARGS="locations list --local". See apps/cli/README.md' \
	'' \
	'Database (local Supabase in Docker)' \
	'  db-up           Start Docker and Supabase, point every app at it. Moves ports if 54321 is taken.' \
	'  db-down         Stop Supabase. Data is kept.' \
	'  db-status       URLs and row counts' \
	'  db-reset        Rebuild from migrations and supabase/seed.sql (drops menus)' \
	'  db-migrate      Apply new migrations, keeping data' \
	'  db-new          New migration. NAME=add_meal_notes' \
	'  db-types        Regenerate packages/supabase types from the local schema' \
	'  db-check        Throwaway Postgres check of new migrations: backwards compatible, seed, types.' \
	'                  BASE=origin/staging. Leaves the local stack alone' \
	'  db-seed         Scrape real UT menus into the local database. DAYS=3' \
	'  db-fixtures     Load the fixed E2E test menus' \
	'  db-sample       Load sample menus and edge-case places (no network)' \
	'  db-fresh        Reset and load the sample data: a known local database in one command' \
	'  db-psql         psql on the local database. ARGS="-c \"select count(*) from menu\""' \
	'  db-studio       Print and open Supabase Studio' \
	'  env-local       Point every app at local Supabase' \
	'  env-dev         Point every app at the hosted dev project (needs SUPABASE_DEV_* vars)' \
	'' \
	'Quality' \
	'  verify          Fast check of what changed since BASE=origin/staging: Biome on changed files,' \
	'                  comment check, typecheck and tests of affected packages, then what else to verify' \
	'  check           Biome, typecheck and tests of everything' \
	'  pre-push        What the pre-push hook runs: CI checks scoped to packages affected since BASE=origin/staging' \
	'  check-staged    What the pre-commit hook runs on staged files: no env files, keys, secrets or files over 1 MB' \
	'  check-comments  Fail on added code comments. ARGS="--base origin/staging" (default: staged diff)' \
	'  check-size      Fail on any source file over 500 lines (MAX_LINES=n to try another cap)' \
	'  check-state     Fail on implicit state machines (2+ boolean useState in one function, string-typed status)' \
	'  check-unused    Fail on unused files, exports and dependencies (knip, config in knip.json)' \
	'  functions       Typecheck and test the Supabase edge functions with Deno (CI runs it too)' \
	'  fix             Biome safe fixes' \
	'  lint | typecheck | test | build' \
	'  size-report     Mobile bundle and website sizes plus Lighthouse, against BASE=origin/staging (BASE= for none).' \
	'                  Writes .context/size-report/report.md, the same comment CI posts on PRs. SKIP_LIGHTHOUSE=1' \
	'' \
	'iOS and E2E (macOS)' \
	'  sim             Boot a simulator (SIM=<name or UDID>, else one with the dev build) and open it' \
	'  sims            List simulators and which have the development build' \
	'  sim-lease       Your own simulator clone for this session, prints "<UDID> <slot>". OWNER=<thread> ARGS="--wait 300"' \
	'  sim-release     Delete a leased clone. SIM=<UDID>' \
	'  sim-leases      Who holds which simulator slot' \
	'  sims-idle       Shut down booted simulators no lease or running process uses, then quit Simulator' \
	'  sim-sweeper     Install the launchd job that shuts down simulators idle for 20 min (every 5 min). ARGS=uninstall|status' \
	'  e2e             Maestro flows against local Supabase. ARGS="--shards 3 --retry-failed"' \
	'  e2e-fixtures    Maestro flows against the fixture server, no Docker needed' \
	'  screenshots     Every screen in apps/mobile/e2e/screenshots.txt, light and dark, into .context/screenshots' \
	'  pr-screenshots  Light and dark shots on a leased simulator, pushed and embedded in the PR body. Falls back' \
	'                  to the CI workflow when every slot is busy or not on a Mac. PR=<n> SCREENS="home map" ARGS=--ci' \
	'  ios-app         Release simulator app into .context/app; reuses the native build unless native code changed' \
	'  perf-build      Timing-harness apps per git ref from a release .app. APP=<base .app> OUT=<dir>' \
	'                  PERF_DEV_REF=<ref> REFS="base=origin/staging head=HEAD"' \
	'                  The rest of the timing run is in scripts/qa/perf/README.md' \
	'  mobile-preview  Dev app build (only if native code changed) + EAS Update. ARGS="staging" or ARGS="pr <n>"' \
	'' \
	'Agents' \
	'  merge-pr        Squash-merge a staging PR once Ethan said yes. PR=<n> TITLE="fix: ..." BODY_FILE=<file>' \
	'  agent-permissions  Merge .agents/agent-permissions.json into ~/.claude/settings.json. Ethan runs it himself' \
	'' \
	'Worktrees' \
	'  worktree        New worktree in .worktrees/ from origin/staging, env files and deps included. NAME=feat-x' \
	'  worktree-rm     Remove .worktrees/NAME. FORCE=1 drops uncommitted changes' \
	'  worktrees       List worktrees' \
	'' \
	'Cleanup' \
	'  clean           Stop Metro, delete E2E simulator clones, remove merged clean worktrees, clear caches' \
	'  stop            Stop Metro and local Supabase, shut down every simulator' \
	'  clean-metro | clean-sims | clean-worktrees | clean-caches' \
	'  clean-deps      Delete every node_modules (then make install)' \
	'' \
	'PRs and ops (GitHub REST through gh: works in cloud sessions and on the Mac)' \
	'  status          Open PRs with CI and merge state, what waits on Ethan, what needs an agent, staging runs' \
	'  pr-ready        Merge staging in when behind, wait for the required checks, green or red with log tails.' \
	'                  PR=<n> ARGS="--no-update --no-wait --timeout 40"' \
	'  pr-setup        Attribution lines, assignee and review request, labels, inline images.' \
	'                  PR=<n> THREAD=<url> LABELS="mobile" IMAGES=<dir>' \
	'  update-prs      Merge staging into open PRs that share files with the latest staging change. ARGS="--all --dry-run"' \
	'  ota-check       Follow the staging OTA update for a merge until it is live. PR=<merged n> or ARGS="--sha <sha>"' \
	'  cleanup         Merged branches (remote and local), finished worktrees, stale simulator clones. YES=1 deletes' \
	'  data-change     Admin CLI commands as one change: backup, dry run, apply, read back.' \
	'                  PLAN=<file> TARGET=local|dev|prod APPLY=1 CONFIRM=<prod ref>' \
	'  cutover         The 2.0.0 cutover steps from #25 and #64: checks, dry runs, one guarded prod step at a time.' \
	'                  ARGS="--run <step> --confirm-prod <prod ref>"'

setup:
	@$(DEV)/setup.sh

install:
	@pnpm install --frozen-lockfile

doctor:
	@$(DEV)/doctor.sh

dev:
	@$(DEV)/db.sh ensure
	@pnpm turbo run dev --filter=@ut-dining/dashboard --filter=@ut-dining/website --filter=@ut-dining/mobile $(ARGS)

mobile:
	@pnpm --filter @ut-dining/mobile start $(ARGS)

ios:
	@LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pnpm --filter @ut-dining/mobile ios $(if $(SIM),--device "$(SIM)") $(ARGS)

android:
	@pnpm --filter @ut-dining/mobile android $(ARGS)

dashboard:
	@pnpm --filter @ut-dining/dashboard dev $(ARGS)

website:
	@pnpm --filter @ut-dining/website dev $(ARGS)

scrape:
	@pnpm --filter @ut-dining/scraper start $(ARGS)

places:
	@pnpm --filter @ut-dining/scraper places $(ARGS)

admin:
	@node apps/cli/src/index.ts $(ARGS)

db-up:
	@$(DEV)/db.sh up

db-down:
	@$(DEV)/db.sh down

db-status:
	@$(DEV)/db.sh status

db-reset:
	@$(DEV)/db.sh reset

db-migrate:
	@$(DEV)/db.sh migrate

db-new:
	@$(DEV)/db.sh new "$(NAME)"

db-types:
	@$(DEV)/db.sh types

db-check:
	@$(DEV)/db-check.sh

db-seed:
	@$(DEV)/db.sh seed "$(DAYS)"

db-fixtures:
	@$(DEV)/db.sh fixtures

db-sample:
	@$(DEV)/db.sh sample

db-fresh:
	@$(DEV)/db.sh fresh

db-psql:
	@$(DEV)/db.sh psql $(ARGS)

db-studio:
	@$(DEV)/db.sh studio

env-local:
	@node scripts/env.ts --local

env-dev:
	@node scripts/env.ts --dev

check:
	@pnpm check

verify:
	@$(DEV)/verify.sh

pre-push:
	@$(DEV)/pre-push.sh </dev/null

check-staged:
	@$(DEV)/check-staged.sh

check-comments:
	@$(DEV)/check-comments.sh $(ARGS)

fix:
	@pnpm fix

lint:
	@pnpm lint

typecheck:
	@pnpm typecheck

test:
	@pnpm test

functions:
	@$(DEV)/functions-check.sh

check-size:
	@$(DEV)/check-file-size.sh

check-state:
	@$(DEV)/check-state-machines.sh

check-unused:
	@pnpm exec knip --no-progress --no-config-hints

build:
	@pnpm build

sim:
	@$(DEV)/sim.sh boot

sims:
	@$(DEV)/sim.sh list

e2e:
	@scripts/qa/mobile-e2e.sh $(if $(SIM),--sim "$$($(DEV)/sim.sh pick)") $(ARGS)

e2e-fixtures:
	@scripts/qa/mobile-e2e.sh --fixture-server $(if $(SIM),--sim "$$($(DEV)/sim.sh pick)") $(ARGS)

screenshots:
	@scripts/qa/mobile-screenshots.sh $(if $(SIM),--sim "$$($(DEV)/sim.sh pick)") $(ARGS)

sim-lease:
	@$(DEV)/sim-lease.sh acquire $(if $(OWNER),--owner "$(OWNER)") $(ARGS)

sim-release:
	@$(DEV)/sim-lease.sh release "$(SIM)"

sim-leases:
	@$(DEV)/sim-lease.sh list

sims-idle:
	@$(DEV)/sim-lease.sh idle --shutdown

sim-sweeper:
	@$(DEV)/sim-lease.sh sweeper $(if $(ARGS),$(ARGS),install)

pr-screenshots:
	@scripts/qa/pr-screenshots.sh $(PR) $(SCREENS) $(ARGS)

merge-pr:
	@$(DEV)/merge-pr.sh $(PR) --title "$(TITLE)" --body-file "$(BODY_FILE)"

agent-permissions:
	@node $(DEV)/agent-permissions.ts $(ARGS)

ios-app:
	@scripts/qa/ios-sim-app.sh $(ARGS)

size-report:
	@scripts/qa/size-report.sh local "$(if $(filter undefined,$(origin BASE)),origin/staging,$(BASE))"

perf-build:
	@test -n "$(APP)" -a -n "$(OUT)" || { echo 'usage: make perf-build APP=<base release .app> OUT=<dir> PERF_DEV_REF=<dev ref> REFS="base=origin/staging head=HEAD"' >&2; exit 2; }
	@scripts/qa/perf/build.sh "$(APP)" "$(OUT)" $(or $(REFS),base=origin/staging head=HEAD)

mobile-preview:
	@scripts/ci/mobile-preview.sh $(ARGS)

worktree:
	@$(DEV)/worktree.sh new "$(NAME)" $(BASE)

worktree-rm:
	@$(DEV)/worktree.sh rm "$(NAME)"

worktrees:
	@$(DEV)/worktree.sh list

clean:
	@$(DEV)/clean.sh all

clean-metro:
	@$(DEV)/clean.sh metro

clean-sims:
	@$(DEV)/clean.sh sims

clean-worktrees:
	@$(DEV)/clean.sh worktrees

clean-caches:
	@$(DEV)/clean.sh caches

clean-deps:
	@$(DEV)/clean.sh deps

stop:
	@$(DEV)/clean.sh stop

OPS := node scripts/dev/ops
.PHONY: status pr-ready pr-setup update-prs ota-check cleanup data-change cutover

status:
	@$(OPS)/status.ts $(ARGS)

pr-ready:
	@$(OPS)/pr-ready.ts $(PR) $(ARGS)

pr-setup:
	@$(OPS)/pr-setup.ts $(PR) $(if $(THREAD),--thread "$(THREAD)") $(foreach label,$(LABELS),--label "$(label)") $(if $(IMAGES),--images "$(IMAGES)") $(ARGS)

update-prs:
	@$(OPS)/update-prs.ts $(ARGS)

ota-check:
	@$(OPS)/ota-check.ts $(if $(PR),--pr $(PR)) $(ARGS)

cleanup:
	@$(OPS)/cleanup.ts $(if $(filter 1,$(YES)),--yes) $(ARGS)

data-change:
	@$(OPS)/data-change.ts "$(PLAN)" $(if $(TARGET),--target $(TARGET)) $(if $(filter 1,$(APPLY)),--apply) $(if $(CONFIRM),--confirm-prod $(CONFIRM)) $(ARGS)

cutover:
	@$(OPS)/cutover.ts $(ARGS)
