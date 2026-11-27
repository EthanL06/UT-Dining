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
	db-up db-down db-status db-reset db-migrate db-new db-types db-check db-seed db-fixtures db-psql db-studio \
	env-local env-dev \
	check verify pre-push check-staged check-comments check-size check-state functions fix lint typecheck test build \
	sim sims sim-lease sim-release sim-leases e2e e2e-fixtures screenshots pr-screenshots ios-app perf-build size-report \
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
	'  e2e             Maestro flows against local Supabase. ARGS="--shards 3 --retry-failed"' \
	'  e2e-fixtures    Maestro flows against the fixture server, no Docker needed' \
	'  screenshots     Every screen in apps/mobile/e2e/screenshots.txt, light and dark, into .context/screenshots' \
	'  pr-screenshots  Light and dark shots on a leased simulator, pushed and embedded in the PR body. Falls back' \
	'                  to the CI workflow when every slot is busy or not on a Mac. PR=<n> SCREENS="home map" ARGS=--ci' \
	'  ios-app         Release simulator app into .context/app; reuses the native build unless native code changed' \
	'  perf-build      Timing-harness test apps from a release .app. APP=<base .app> OUT=<dir> PERF_DEV_REF=<ref>' \
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
	'  clean-deps      Delete every node_modules (then make install)'

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
	@pnpm --filter @ut-dining/mobile ios $(if $(SIM),--device "$(SIM)") $(ARGS)

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
	@test -n "$(APP)" -a -n "$(OUT)" || { echo 'usage: make perf-build APP=<base release .app> OUT=<dir> PERF_DEV_REF=<dev ref>' >&2; exit 2; }
	@scripts/qa/perf/build.sh "$(APP)" "$(OUT)"

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
