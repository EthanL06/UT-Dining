import { parseArgs } from 'node:util';
import {
  behindBy,
  type CheckSummary,
  checksFor,
  getPrSettled,
  gh,
  jobLogTail,
  type PullRequest,
  prFiles,
  prNumber,
  REPO,
  requiredChecks,
  say,
  sleep,
  tryGh,
} from './github.ts';

const USAGE = `Usage: make pr-ready PR=<n> [ARGS="--no-update --no-wait --timeout 30"]

Gets a PR ready to merge and reports green or red:
  1. Waits for GitHub to compute mergeability.
  2. Merges staging into the branch when it is behind (a merge commit through the
     update-branch API, never a force push). --no-update skips this.
  3. Waits for the required checks ("Lint, typecheck, test", "Conventional PR title" and any the
     base branch's rulesets require). Vercel checks are reported but never block: the
     Hobby plan's daily deploy cap makes them fail for reasons unrelated to the code.
  4. Prints the last lines of the log of every failed check.
Exit code: 0 green, 1 red, 2 usage, 3 timed out.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'no-update': { type: 'boolean', default: false },
    'no-wait': { type: 'boolean', default: false },
    timeout: { type: 'string', default: '40' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const number = prNumber(positionals[0], USAGE);
const deadline = Date.now() + Number(values.timeout) * 60_000;

const overlapWithStaging = (pr: PullRequest) => {
  const compare = behindBy(pr.head.sha, pr.base.ref);
  const changed = gh<{ files?: { filename: string }[] }>(
    `compare/${compare.merge_base_commit.sha}...${encodeURIComponent(pr.base.ref)}`,
  ).files?.map((file) => file.filename);
  const ours = new Set(prFiles(pr.number));
  return (changed ?? []).filter((file) => ours.has(file));
};

const conflictHelp = (pr: PullRequest) => {
  const files = overlapWithStaging(pr);
  say.bad(
    `#${pr.number} has a merge conflict with ${pr.base.ref}. GitHub runs no CI until it is fixed.`,
  );
  if (files.length > 0) say.note(`Files both sides changed: ${files.join(', ')}`);
  say.note(
    `Fix it in the branch: git fetch origin ${pr.base.ref} ${pr.head.ref} && git switch ${pr.head.ref} && git merge origin/${pr.base.ref}`,
  );
  say.note('Resolve, commit, push (never force-push), then run make pr-ready again.');
  process.exit(1);
};

const waitForNewHead = async (oldSha: string): Promise<PullRequest> => {
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const pr = await getPrSettled(number);
    if (pr.head.sha !== oldSha) return pr;
  }
  return say.die('GitHub accepted the update but the branch did not move within 90 s. Run again.');
};

const updateBranch = async (pr: PullRequest): Promise<PullRequest> => {
  if (pr.mergeable_state === 'dirty') conflictHelp(pr);
  const compare = behindBy(pr.head.sha, pr.base.ref);
  if (compare.ahead_by === 0) {
    say.ok(`up to date with ${pr.base.ref}`);
    return pr;
  }
  if (values['no-update']) {
    say.warn(`${compare.ahead_by} commit(s) behind ${pr.base.ref}; not updating (--no-update)`);
    return pr;
  }
  if (pr.head.repo?.full_name !== REPO) say.die('The PR comes from a fork; update it by hand.');
  say.step(`Merging ${pr.base.ref} into ${pr.head.ref} (${compare.ahead_by} commit(s) behind)`);
  const result = tryGh(`pulls/${number}/update-branch`, 'PUT', {
    expected_head_sha: pr.head.sha,
  });
  if (!result.ok) {
    if (result.error.status === 422 && /conflict/i.test(result.error.message)) conflictHelp(pr);
    say.die(`update-branch failed: ${result.error.message}`);
  }
  const updated = await waitForNewHead(pr.head.sha);
  say.ok(`merged ${pr.base.ref} in, head is now ${updated.head.sha.slice(0, 7)}`);
  return updated;
};

const line = (check: CheckSummary, required: boolean) =>
  `${check.name}: ${check.detail}${required ? '' : check.vercel ? ' (Vercel, ignored)' : ' (not required)'}`;

const report = (pr: PullRequest, required: string[], checks: CheckSummary[]) => {
  const byName = new Map(checks.map((check) => [check.name, check]));
  const missing = required.filter((name) => !byName.has(name));
  const blocking = required.flatMap((name) => {
    const check = byName.get(name);
    return check && check.state === 'fail' ? [check] : [];
  });
  const others = checks.filter((check) => !required.includes(check.name));
  for (const name of required) {
    const check = byName.get(name);
    if (!check) say.warn(`${name}: not started`);
    else if (check.state === 'pass') say.ok(line(check, true));
    else if (check.state === 'fail') say.bad(line(check, true));
    else say.note(line(check, true));
  }
  for (const check of others) {
    if (check.state === 'fail') say.warn(line(check, false));
    else if (check.state === 'pending') say.note(line(check, false));
  }
  const quiet = others.filter((check) => check.state === 'pass').length;
  if (quiet > 0) say.note(`${quiet} other check(s) pass or were skipped`);
  for (const check of [...blocking, ...others.filter((c) => c.state === 'fail' && !c.vercel)]) {
    if (check.jobId === null) continue;
    say.step(`Log tail: ${check.name} (${check.url})`);
    console.log(jobLogTail(check.jobId));
  }
  if (missing.length > 0 && pr.mergeable_state === 'dirty') conflictHelp(pr);
  return { missing, blocking };
};

const main = async () => {
  say.step(`#${number}`);
  let pr = await getPrSettled(number);
  if (pr.state !== 'open') say.die(`#${number} is ${pr.merged ? 'already merged' : 'closed'}.`);
  say.note(`${pr.title}  (${pr.head.ref} -> ${pr.base.ref}, ${pr.html_url})`);
  if (pr.base.ref !== 'staging') say.warn(`base is ${pr.base.ref}, not staging`);
  if (pr.draft) say.warn('draft: mark it ready before asking Ethan to merge');
  pr = await updateBranch(pr);

  const required = requiredChecks(pr.base.ref);
  say.step(`Checks on ${pr.head.sha.slice(0, 7)} (required: ${required.join(', ')})`);
  let lastPending = '';
  for (;;) {
    const checks = checksFor(pr.head.sha);
    const byName = new Map(checks.map((check) => [check.name, check]));
    const states = required.map((name) => byName.get(name)?.state ?? 'missing');
    const failed = states.includes('fail');
    const done = states.every((state) => state === 'pass' || state === 'fail');
    if (failed || done || values['no-wait'] || Date.now() > deadline) {
      const latest = await getPrSettled(number);
      if (latest.head.sha !== pr.head.sha) {
        say.warn(`the branch moved to ${latest.head.sha.slice(0, 7)} while waiting; run again`);
        process.exit(3);
      }
      const { missing, blocking } = report(latest, required, checks);
      if (blocking.length > 0) {
        say.bad(`RED: ${blocking.map((c) => c.name).join(', ')} failed`);
        process.exit(1);
      }
      if (!done) {
        say.warn(
          `NOT DONE: ${missing.length > 0 ? `${missing.join(', ')} not started. ` : ''}Still running after the wait. Run again later.`,
        );
        process.exit(3);
      }
      const state = latest.mergeable_state;
      if (state === 'dirty') conflictHelp(latest);
      say.ok(
        `GREEN: required checks pass (mergeable_state ${state}). Ask Ethan, then: make merge-pr PR=${number} TITLE="..." BODY_FILE=...`,
      );
      process.exit(0);
    }
    const pending = required.filter((_, i) => states[i] !== 'pass').join(', ');
    if (pending !== lastPending) {
      say.note(`waiting for ${pending}`);
      lastPending = pending;
    }
    await sleep(20_000);
  }
};

await main();
