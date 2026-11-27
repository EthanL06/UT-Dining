import { parseArgs } from 'node:util';
import { getPr, gh, ghText, jobLogTail, say, sleep } from './github.ts';

const USAGE = `Usage: make ota-check [PR=<merged PR>] [ARGS="--sha <commit> --timeout 30"]

After a merge into staging, follows the "Mobile preview" run for that commit and reports when the
EAS update on channel "staging" is live (the update page link), or that the merge needs no update
because it does not touch the app. Also says when a new dev build started, which Ethan has to
install. Default commit: the merge commit of PR, else the newest commit on staging.
Exit code: 0 live or nothing to publish, 1 failed, 3 timed out.`;

const { values } = parseArgs({
  options: {
    pr: { type: 'string' },
    sha: { type: 'string' },
    timeout: { type: 'string', default: '30' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const APP_PATHS = [
  /^apps\/mobile\/(?!e2e\/)/,
  /^packages\/(core|supabase)\//,
  /^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/,
  /^scripts\/ci\/mobile-preview\.sh$/,
  /^\.github\/workflows\/mobile-preview\.yml$/,
];

interface Run {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
}

const commitSha = (): string => {
  if (values.sha) return values.sha;
  if (values.pr) {
    const pr = getPr(Number(values.pr));
    if (!pr.merged || !pr.merge_commit_sha) return say.die(`#${values.pr} is not merged yet.`);
    if (pr.base.ref !== 'staging')
      say.warn(`#${values.pr} merged into ${pr.base.ref}, not staging`);
    return pr.merge_commit_sha;
  }
  return gh<{ sha: string }>('commits/staging').sha;
};

const findRun = (sha: string) =>
  gh<{ workflow_runs: Run[] }>(
    `actions/workflows/mobile-preview.yml/runs?head_sha=${sha}&event=push&per_page=5`,
  ).workflow_runs[0];

const main = async () => {
  const sha = commitSha();
  const deadline = Date.now() + Number(values.timeout) * 60_000;
  say.step(`OTA update for ${sha.slice(0, 7)} on channel staging`);
  const files = gh<{ files?: { filename: string }[] }>(`commits/${sha}`).files ?? [];
  const touchesApp = files.some((file) => APP_PATHS.some((path) => path.test(file.filename)));
  if (!touchesApp) {
    say.ok('this commit does not touch the app, so no OTA update is published for it');
    return;
  }

  let run = findRun(sha);
  for (let i = 0; !run && i < 12; i++) {
    await sleep(10_000);
    run = findRun(sha);
  }
  if (!run) return say.die('no "Mobile preview" run started for this commit within 2 minutes.');
  say.note(run.html_url);

  let lastStatus = '';
  while (run.status !== 'completed') {
    if (Date.now() > deadline) {
      say.warn(`still ${run.status} after ${values.timeout} min; run make ota-check again later`);
      process.exit(3);
    }
    if (run.status !== lastStatus) {
      say.note(`run ${run.status}`);
      lastStatus = run.status;
    }
    await sleep(20_000);
    run = gh<Run>(`actions/runs/${run.id}`);
  }

  const jobs = gh<{ jobs: { id: number; name: string; conclusion: string | null }[] }>(
    `actions/runs/${run.id}/jobs`,
  ).jobs;
  const job = jobs.find((item) => item.name === 'Dev build and OTA update');
  if (run.conclusion !== 'success' || !job) {
    say.bad(`the Mobile preview run ended ${run.conclusion}`);
    if (job) console.log(jobLogTail(job.id));
    process.exit(1);
  }
  const log = ghText(`actions/jobs/${job.id}/logs`);
  if (/^\S+ ##\[notice\]EXPO_TOKEN is not set/m.test(log)) {
    say.bad('EXPO_TOKEN is not set in the repo secrets, so nothing was published');
    process.exit(1);
  }
  const update = /OTA update for `[0-9a-f]+` on channel `staging`: \[update page\]\((\S+)\)/.exec(
    log,
  );
  if (!update) {
    say.bad('the run passed but its log has no update link; read it by hand');
    say.note(run.html_url);
    process.exit(1);
  }
  say.ok(`live on channel staging: ${update[1]}`);
  const build = /a new dev build started \(\[build page\]\((\S+)\)/.exec(log)?.[1];
  if (build) {
    say.warn(`native code changed: a new dev build started (${build}). Ethan has to install it.`);
  } else {
    say.note(
      'UT Dining (Dev) on staging picks it up at the next launch, or QA Menu > Check for Update',
    );
  }
};

await main();
