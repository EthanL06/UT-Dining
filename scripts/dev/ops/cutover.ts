import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { DEV_REF, PROD_REF, say } from './github.ts';

const USAGE = `Usage: make cutover [ARGS="--phase pre|post --run <step id> --confirm-prod ${PROD_REF}"]

The 2.0.0 cutover from PR #25 (before the staging to main merge) and issue #64 (after it), as steps.
  make cutover                          Lists every step and runs the read-only checks. Writes nothing.
  make cutover ARGS="--run <id>"        One step. A check runs; a prod step runs as a dry run
                                        (admin --dry-run, supabase db push --dry-run) and writes nothing.
  make cutover ARGS="--run <id> --confirm-prod ${PROD_REF}"
                                        Runs that one prod step for real, after a typed confirmation
                                        in a terminal. Only with Ethan's OK for that step.
Manual steps (dashboards, App Store Connect, Render) are printed with what to do. Tick the box on
#25 or #64 when a step is done.`;

type Phase = 'pre' | 'post';

interface Check {
  url: string;
  expect: (status: number, body: string) => string | null;
}

type Step =
  | { id: string; phase: Phase; kind: 'check'; title: string; checks: Check[] }
  | {
      id: string;
      phase: Phase;
      kind: 'prod';
      title: string;
      dryRun: string[][];
      apply: string[][];
      needsMain?: boolean;
    }
  | { id: string; phase: Phase; kind: 'manual'; title: string; how: string };

const admin = (...args: string[]) => ['pnpm', '-s', 'admin', ...args, '--prod'];
const supabase = (...args: string[]) => ['pnpm', 'exec', 'supabase', ...args];
const ok200 = (status: number) => (status === 200 ? null : `HTTP ${status}, expected 200`);

const STEPS: Step[] = [
  {
    id: 'site-pages',
    phase: 'pre',
    kind: 'check',
    title: 'utdining.app serves the home, changelog and privacy pages',
    checks: ['/', '/changelog/', '/privacy-policy/'].map((path) => ({
      url: `https://utdining.app${path}`,
      expect: ok200,
    })),
  },
  {
    id: 'old-pages-site',
    phase: 'pre',
    kind: 'check',
    title: 'The old GitHub Pages site still answers until 2.0.0 is live',
    checks: [
      {
        url: 'https://longhorn-developers.github.io/ut-dining-website/privacy-policy',
        expect: ok200,
      },
    ],
  },
  {
    id: 'prod-migrations',
    phase: 'pre',
    kind: 'prod',
    title:
      'Apply the pending prod migrations in order (prune, changelog, admin allowlist, status functions, last menu write)',
    dryRun: [
      supabase('link', '--project-ref', PROD_REF),
      supabase('db', 'push', '--dry-run'),
      supabase('link', '--project-ref', DEV_REF),
    ],
    apply: [
      supabase('link', '--project-ref', PROD_REF),
      supabase('db', 'push'),
      supabase('link', '--project-ref', DEV_REF),
    ],
  },
  {
    id: 'support-links',
    phase: 'pre',
    kind: 'prod',
    title: 'Move the app links to utdining.app and drop the FAQ link',
    dryRun: [
      [
        ...admin(
          'support-links',
          'update',
          'privacy policy',
          '--url',
          'https://utdining.app/privacy-policy/',
        ),
        '--dry-run',
      ],
      [
        ...admin(
          'support-links',
          'update',
          'source code',
          '--url',
          'https://github.com/EthanL06/UT-Dining',
        ),
        '--dry-run',
      ],
      [...admin('support-links', 'remove', 'faq', '--yes'), '--dry-run'],
    ],
    apply: [
      [
        ...admin(
          'support-links',
          'update',
          'privacy policy',
          '--url',
          'https://utdining.app/privacy-policy/',
        ),
        '--confirm-prod',
        PROD_REF,
      ],
      [
        ...admin(
          'support-links',
          'update',
          'source code',
          '--url',
          'https://github.com/EthanL06/UT-Dining',
        ),
        '--confirm-prod',
        PROD_REF,
      ],
      [...admin('support-links', 'remove', 'faq', '--yes'), '--confirm-prod', PROD_REF],
    ],
  },
  {
    id: 'auth-urls',
    phase: 'pre',
    kind: 'manual',
    title: 'Prod Auth URL configuration',
    how: `Supabase prod (https://supabase.com/dashboard/project/${PROD_REF}/auth/url-configuration): Site URL https://dashboard.utdining.app. Redirect URLs: https://dashboard.utdining.app/auth/callback, https://ut-dining-dashboard.vercel.app/auth/callback, https://ut-dining-dashboard-*.vercel.app/**, http://localhost:3000/**.`,
  },
  {
    id: 'app-store-release',
    phase: 'pre',
    kind: 'manual',
    title: 'Release 2.0.0 to the App Store before promoting main',
    how: 'PR #25 step 3: TestFlight smoke test against prod, iPad check, new screenshots, store text and URLs, eas build --profile production then eas submit, phased release.',
  },
  {
    id: 'app-store-version',
    phase: 'pre',
    kind: 'check',
    title: 'The App Store serves 2.0.0',
    checks: [
      {
        url: 'https://itunes.apple.com/lookup?bundleId=com.ethanl06.ut-dining&country=us',
        expect: (status, body) => {
          if (status !== 200) return `HTTP ${status}`;
          const version = /"version":"([^"]+)"/.exec(body)?.[1];
          return version === '2.0.0' ? null : `App Store shows ${version ?? 'nothing'}, not 2.0.0`;
        },
      },
    ],
  },
  {
    id: 'promote',
    phase: 'pre',
    kind: 'manual',
    title: 'Promote staging to main',
    how: 'Ethan only: open a staging -> main PR, wait for CI and "Maestro on iOS", merge with a merge commit (not squash). Then the post steps.',
  },
  {
    id: 'email-off',
    phase: 'post',
    kind: 'manual',
    title: 'Turn Email sign-in off in prod Auth',
    how: `https://supabase.com/dashboard/project/${PROD_REF}/auth/providers: Email off. Google stays on.`,
  },
  {
    id: 'push-function',
    phase: 'post',
    kind: 'prod',
    title: 'Deploy manual-push-notification to prod from main (#46, #51, #54)',
    needsMain: true,
    dryRun: [
      [
        'git',
        'log',
        '-1',
        '--format=%h %s',
        'origin/main',
        '--',
        'supabase/functions/manual-push-notification',
      ],
    ],
    apply: [supabase('functions', 'deploy', 'manual-push-notification', '--project-ref', PROD_REF)],
  },
  {
    id: 'render-suspend',
    phase: 'post',
    kind: 'manual',
    title: 'Suspend the Render cron before the next 07:00 UTC',
    how: 'Render dashboard: suspend ut-dining-scraper-new (do not delete). Then run "Scrape menus" once by hand from the Actions tab and read its log.',
  },
  {
    id: 'status-api',
    phase: 'post',
    kind: 'check',
    title: 'status.utdining.app/api/status answers 200 with JSON',
    checks: [
      {
        url: 'https://status.utdining.app/api/status',
        expect: (status, body) =>
          status !== 200 ? `HTTP ${status}` : body.trimStart().startsWith('{') ? null : 'not JSON',
      },
    ],
  },
  {
    id: 'dashboard-live',
    phase: 'post',
    kind: 'check',
    title: 'dashboard.utdining.app loads',
    checks: [
      {
        url: 'https://dashboard.utdining.app/',
        expect: (status) => (status < 400 ? null : `HTTP ${status}`),
      },
    ],
  },
  {
    id: 'release-date',
    phase: 'post',
    kind: 'prod',
    title: 'Set the 2.0.0 changelog release date (after 2.0.0 is live)',
    dryRun: [
      [
        ...admin(
          'changelog',
          'upsert',
          '2.0.0',
          '--release-date',
          new Date().toISOString().slice(0, 10),
        ),
        '--dry-run',
      ],
    ],
    apply: [
      [
        ...admin(
          'changelog',
          'upsert',
          '2.0.0',
          '--release-date',
          new Date().toISOString().slice(0, 10),
        ),
        '--confirm-prod',
        PROD_REF,
      ],
    ],
  },
  {
    id: 'lock-main',
    phase: 'post',
    kind: 'manual',
    title: 'Required checks on main, Renovate, Dependabot alerts',
    how: 'Settings > Rules > "Protect main": require "Maestro on iOS" and "Lint, typecheck, test". Install https://github.com/apps/renovate for this repo. Turn on Dependabot alerts at https://github.com/EthanL06/UT-Dining/settings/security_analysis.',
  },
];

const { values } = parseArgs({
  options: {
    phase: { type: 'string' },
    run: { type: 'string' },
    'confirm-prod': { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const root = join(import.meta.dirname, '..', '..', '..');

const runCheck = async (step: Extract<Step, { kind: 'check' }>) => {
  let passed = true;
  for (const check of step.checks) {
    const problem = await fetch(check.url, { redirect: 'manual' })
      .then(async (response) => check.expect(response.status, await response.text()))
      .catch(
        (error: unknown) =>
          `unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    if (problem) {
      passed = false;
      say.warn(`${check.url}: ${problem}`);
    }
  }
  if (passed) say.ok(step.title);
  return passed;
};

const exec = (command: string[]) => {
  console.log(
    `+ ${command.map((arg) => (/[\s"']/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')}`,
  );
  const [bin, ...args] = command;
  if (!bin) return false;
  return spawnSync(bin, args, { cwd: root, stdio: 'inherit' }).status === 0;
};

const confirm = async (step: Step) => {
  if (!process.stdin.isTTY) {
    say.die(
      'a prod step needs a terminal to type the confirmation. Run it on the Mac in a terminal.',
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type "${step.id}" to run it against production: `);
  rl.close();
  return answer.trim() === step.id;
};

const runProd = async (step: Extract<Step, { kind: 'prod' }>) => {
  const real = values['confirm-prod'] === PROD_REF;
  if (values['confirm-prod'] && !real) say.die(`--confirm-prod must be ${PROD_REF}`);
  if (!real) {
    say.step(`Dry run: ${step.title}`);
    const failed = step.dryRun.filter((command) => !exec(command));
    if (failed.length > 0) say.die(`dry run failed: ${failed.map((c) => c.join(' ')).join('; ')}`);
    say.ok('dry run done, nothing was written');
    say.note(`With Ethan's OK: make cutover ARGS="--run ${step.id} --confirm-prod ${PROD_REF}"`);
    return;
  }
  if (step.needsMain) {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    if (branch !== 'main') say.die(`${step.id} deploys from main; this checkout is on ${branch}`);
  }
  say.step(`PRODUCTION: ${step.title}`);
  for (const command of step.apply) console.log(`  ${command.join(' ')}`);
  if (!(await confirm(step))) say.die('not confirmed, nothing ran');
  for (const command of step.apply)
    if (!exec(command)) say.die(`${step.id} failed; read the output above`);
  say.ok(`${step.id} done. Tick its box on #25 or #64.`);
};

const main = async () => {
  if (values.run) {
    const step = STEPS.find((item) => item.id === values.run);
    if (!step)
      return say.die(`no step ${values.run}. Steps: ${STEPS.map((s) => s.id).join(', ')}`, 2);
    if (step.kind === 'check') process.exit((await runCheck(step)) ? 0 : 1);
    if (step.kind === 'manual') {
      say.step(step.title);
      console.log(`  ${step.how}`);
      return;
    }
    await runProd(step);
    return;
  }
  for (const phase of ['pre', 'post'] as const) {
    if (values.phase && values.phase !== phase) continue;
    say.step(phase === 'pre' ? 'Before the staging to main merge (#25)' : 'After the merge (#64)');
    for (const step of STEPS.filter((item) => item.phase === phase)) {
      if (step.kind === 'check') await runCheck(step);
      else if (step.kind === 'manual') say.note(`[manual] ${step.id}: ${step.title}`);
      else say.note(`[prod]   ${step.id}: ${step.title}`);
    }
  }
  say.note(
    'Nothing was written. make cutover ARGS="--run <id>" shows one step in detail (dry run).',
  );
};

await main();
