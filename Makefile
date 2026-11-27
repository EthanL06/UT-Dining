SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

DEV := scripts/dev
ARGS ?=
NAME ?=
SIM ?=
DAYS ?= 3
export DB SEED DAYS SIM FORCE METRO_PORT SUPABASE_EXCLUDE

.PHONY: help setup install doctor \
	dev mobile ios android dashboard website scrape admin \
	db-up db-down db-status db-reset db-migrate db-new db-types db-seed db-fixtures db-psql db-studio \
	env-local env-dev \
	check fix lint typecheck test build \
	sim sims e2e e2e-fixtures \
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
	'  website         Website on http://localhost:3001/ut-dining-website' \
	'  scrape          Run the scraper once with apps/scraper/.env.local' \
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
	'  db-seed         Scrape real UT menus into the local database. DAYS=3' \
	'  db-fixtures     Load the fixed E2E test menus' \
	'  db-psql         psql on the local database. ARGS="-c \"select count(*) from menu\""' \
	'  db-studio       Print and open Supabase Studio' \
	'  env-local       Point every app at local Supabase' \
	'  env-dev         Point every app at the hosted dev project (needs SUPABASE_DEV_* vars)' \
	'' \
	'Quality' \
	'  check           Biome, typecheck and tests (run before pushing)' \
	'  fix             Biome safe fixes' \
	'  lint | typecheck | test | build' \
	'' \
	'iOS and E2E (macOS)' \
	'  sim             Boot a simulator (SIM=<name or UDID>, else one with the dev build) and open it' \
	'  sims            List simulators and which have the development build' \
	'  e2e             Maestro flows against local Supabase. ARGS="--shards 3 --retry-failed"' \
	'  e2e-fixtures    Maestro flows against the fixture server, no Docker needed' \
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

fix:
	@pnpm fix

lint:
	@pnpm lint

typecheck:
	@pnpm typecheck

test:
	@pnpm test

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
