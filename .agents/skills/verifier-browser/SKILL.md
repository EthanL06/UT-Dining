---
name: verifier-browser
description: Verify changes to UT Dining's web apps in a real browser, the way a user uses them - the admin dashboard (apps/dashboard, Next.js + Mantine + Supabase auth) and the public website (apps/website, static Next.js export) - pages load, flows work, no console errors. Use for any change under apps/dashboard/** or apps/website/** that a user can see or click.
---

# verifier-browser

Drives the dashboard and the website with agent-browser against the dev servers of the worktree under test.

| App | Start | URL | Needs |
|---|---|---|---|
| Dashboard | `pnpm --filter @ut-dining/dashboard dev --port <port>` (default 3000) | `http://localhost:<port>/login` | Local Supabase and a local user |
| Website | `pnpm --filter @ut-dining/website dev --port <port>` (default 3001) | `http://localhost:<port>/ut-dining-website/` | Nothing |

## Setup

1. `cd "$(git rev-parse --show-toplevel)"` and `pnpm install --frozen-lockfile` if `node_modules` is missing.
2. For the dashboard only: local Supabase must be running (see verifier-data setup steps 1 to 5, including the port check), then `node scripts/env.ts --local` writes `apps/dashboard/.env.local` with the local URL and anon key. Never point the dashboard at the hosted dev or production project.
3. Start each dev server the change touches on a free port and keep its log: `pnpm --filter @ut-dining/<app> dev --port <port> > "$run/<app>.log" 2>&1 &`. Save the PID. Wait until `curl -sf -o /dev/null <URL>` answers (at most 90 s), else BLOCKED with the last 30 lines of the log. The website answers its root with a redirect to the base path, so curl the base path.
4. Use one headless browser session per run: `export AGENT_BROWSER_SESSION="verify-$(basename "$run")"` and `unset AGENT_BROWSER_HEADED`. Do not pass `--headed` unless a check needs a window, and say why in the result. In a Linux cloud container, also `export AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium AGENT_BROWSER_ARGS=--no-sandbox` when that Chromium exists.
5. Sign in to the dashboard: only Google accounts listed in `public.dashboard_admins` get in, and email and password sign-in is off, so mint a session instead of signing in through Google.
   - Allow a local test admin: `docker exec -i supabase_db_ut-dining psql -U postgres -c "insert into public.dashboard_admins (email) values ('admin@local.test') on conflict do nothing"`. Create the user with the auth admin API (`POST $API_URL/auth/v1/admin/users` with the service role key, body `{"email":"admin@local.test","email_confirm":true,"app_metadata":{"provider":"google","providers":["google"]}}`); the signup trigger rejects any email that is not in `dashboard_admins`.
   - Sign an access token with the local `JWT_SECRET` from `pnpm exec supabase status -o env` (HS256, `aud` and `role` `authenticated`, `sub` the user id, `email`, `app_metadata.providers` containing `google`, and `amr` `[{"method":"oauth","timestamp":<now>}]`). `public.is_dashboard_admin()` needs both the Google provider and the `oauth` amr.
   - Set the cookie `sb-127-auth-token` on `localhost` to `base64-` followed by the base64url of `{"access_token":<token>,"refresh_token":"x","expires_at":<exp>,"expires_in":3600,"token_type":"bearer","user":<the user JSON>}`, then open `/dashboard`. It must stay on `/dashboard`. A user outside `dashboard_admins` must land on `/login?error=not_allowed`.
   - The real Google hop needs a Google OAuth client. Locally, `supabase start` reads it from `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`; placeholder values are enough to see the redirect to accounts.google.com.

## Steps

For each claim that touches the UI:

1. `agent-browser open <URL><path>` and `agent-browser snapshot -i -c` to find the elements.
2. Do the flow as a user would (`click`, `fill`, `press`, `select`). Use refs from the snapshot, not guessed selectors.
3. Check the result on the page (`get text`, `is visible`), not only that no error appeared. For a dashboard change that writes data, read it back after a reload, or with `docker exec -i supabase_db_ut-dining psql -U postgres -At -c "<query>"`.
4. `agent-browser screenshot "$run/<claim>-<state>.png"` for each state the claim names. Use absolute paths; a relative path saves into agent-browser's own temp folder. For UI work, take the same states and viewports as the approved mockup (`set viewport 390 844` for mobile, `set media dark` for dark mode; the website has a "Toggle theme" button too).
5. `agent-browser errors` and `agent-browser console`: a new error or warning from this change is a FAIL. HMR, Fast Refresh and React DevTools lines are normal in dev.
6. Website links must keep the `/ut-dining-website` base path. A link or asset that drops it is a FAIL.

Adjacent probes: reload the page and check the state survives when it should; go back and forward once.

## Teardown

`agent-browser close`, then stop the dev server PIDs you started. Stop nothing else.

## Result

PASS, FAIL or BLOCKED for each claim, with the screenshot and log paths.

## Track record
