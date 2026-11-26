---
name: verifier-tests
description: Run UT Dining's static checks and automated tests on the worktree under test - Biome lint and format, TypeScript 7 typecheck of every package, Vitest in packages/core and apps/scraper, and the dashboard and website builds that CI runs - and check that new behavior has a test. Use for every change.
---

# verifier-tests

## Steps

1. `pnpm install --frozen-lockfile` when `node_modules` is missing or `pnpm-lock.yaml` changed.
2. The full check, the same as CI: `pnpm biome ci > "$run/biome.log" 2>&1`, then `pnpm turbo run typecheck test > "$run/check.log" 2>&1`. Locally `pnpm check` runs both in one go. It takes about 10 s warm.
3. When the diff touches `apps/dashboard`, `apps/website`, `packages/*` or `pnpm-lock.yaml`, also build the web apps as CI does: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder pnpm turbo run build --filter=@ut-dining/dashboard --filter=@ut-dining/website > "$run/build.log" 2>&1`.
4. For a fast loop on one package, run only that package first (`pnpm --filter @ut-dining/core test`, `pnpm --filter @ut-dining/scraper test`, `pnpm --filter @ut-dining/<app> typecheck`), then the full check once at the end.
5. A failure that also happens on the base branch is not this change's fault. Prove it: run the same command in a scratch worktree of `origin/staging`. Report it as "already broken on base", not as FAIL.
6. New behavior needs a test. Only `packages/core` and `apps/scraper` have Vitest set up; tests sit next to the source as `*.test.ts`. When the diff adds or changes logic in those packages and no test covers it, the claim "has a test" is FAIL. For `apps/mobile`, `apps/dashboard` and `apps/website` there is no test runner yet, so say so and lean on the other verifiers. Write the missing test only if the task allows it.
7. Never skip, delete or loosen a test or a lint rule to get a pass, and never commit with `--no-verify`.

## Result

PASS, FAIL or BLOCKED, with each command, its exit code and the log path.

## Track record
