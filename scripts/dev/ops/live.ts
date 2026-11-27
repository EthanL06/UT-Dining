import {
  type Build,
  buildPr,
  buildUrl,
  fetchEas,
  RUNNING_BUILD,
  type Update,
  updateUrl,
} from './expo.ts';
import { gh, type PullRequest } from './github.ts';

interface Run {
  status: string;
  conclusion: string | null;
  html_url: string;
  head_sha: string;
}

export type OtaState =
  | { kind: 'not-app' }
  | { kind: 'publishing'; run: string }
  | { kind: 'failed'; run: string }
  | { kind: 'current'; update: Update }
  | { kind: 'stale'; update: Update }
  | { kind: 'missing' };

export type Installable =
  | { kind: 'ready'; build: Build }
  | { kind: 'building'; build: Build }
  | { kind: 'no-build' }
  | { kind: 'unknown' };

export interface LivePr {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  head: string;
  mergeable: string;
  labels: string[];
  ota: OtaState;
  installable: Installable;
}

const previewRun = (sha: string): Run | undefined =>
  gh<{ workflow_runs: Run[] }>(
    `actions/workflows/mobile-preview.yml/runs?head_sha=${sha}&per_page=5`,
  ).workflow_runs[0];

export const otaState = (head: string, run: Run | undefined, update: Update | null): OtaState => {
  if (update?.gitCommitHash === head) return { kind: 'current', update };
  if (run && run.status !== 'completed') return { kind: 'publishing', run: run.html_url };
  if (run && run.conclusion === 'failure') return { kind: 'failed', run: run.html_url };
  if (!run) return update ? { kind: 'stale', update } : { kind: 'not-app' };
  return update ? { kind: 'stale', update } : { kind: 'missing' };
};

export const installable = (runtime: string | null, builds: Build[]): Installable => {
  if (!runtime) return { kind: 'unknown' };
  const matching = builds.filter((build) => build.runtimeVersion === runtime);
  const finished = matching.find((build) => build.status === 'FINISHED');
  if (finished) return { kind: 'ready', build: finished };
  const running = matching.find((build) => RUNNING_BUILD.has(build.status));
  if (running) return { kind: 'building', build: running };
  return { kind: 'no-build' };
};

const central = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '-';

export interface Live {
  generatedAt: string;
  eas: 'ok' | string;
  prs: LivePr[];
  builds: Build[];
  staging: { head: string; update: Update | null; run: Run | undefined };
  merged: { number: number; title: string; mergedAt: string; sha: string }[];
}

export const collectLive = async (prs: PullRequest[]): Promise<Live> => {
  const branches = [...prs.map((pr) => `pr-${pr.number}`), 'staging'];
  const eas = await fetchEas(branches, 25).then(
    (data) => ({ ok: true as const, data }),
    (error: unknown) => ({ ok: false as const, error: String(error) }),
  );
  const builds = eas.ok ? eas.data.builds : [];
  const update = (name: string) => (eas.ok ? (eas.data.updates.get(name) ?? null) : null);
  const live: LivePr[] = prs.map((pr) => {
    const ota = otaState(pr.head.sha, previewRun(pr.head.sha), update(`pr-${pr.number}`));
    const runtime =
      ota.kind === 'current' || ota.kind === 'stale' ? ota.update.runtimeVersion : null;
    return {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      draft: pr.draft,
      head: pr.head.sha,
      mergeable: pr.mergeable_state,
      labels: pr.labels.map((label) => label.name),
      ota,
      installable: eas.ok ? installable(runtime, builds) : { kind: 'unknown' },
    };
  });
  const stagingHead = gh<{ sha: string }>('commits/staging').sha;
  const since = Date.now() - 24 * 3600_000;
  const merged = gh<PullRequest[]>(
    'pulls?state=closed&base=staging&sort=updated&direction=desc&per_page=30',
  )
    .filter((pr) => pr.merged_at && Date.parse(pr.merged_at) > since)
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      mergedAt: pr.merged_at ?? '',
      sha: pr.merge_commit_sha ?? '',
    }))
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
  return {
    generatedAt: new Date().toISOString(),
    eas: eas.ok ? 'ok' : eas.error,
    prs: live,
    builds,
    staging: { head: stagingHead, update: update('staging'), run: previewRun(stagingHead) },
    merged,
  };
};

const short = (sha: string | null | undefined) => (sha ? sha.slice(0, 7) : '-');

const otaText = (ota: OtaState, head: string): string => {
  switch (ota.kind) {
    case 'not-app':
      return 'n/a (no app change)';
    case 'publishing':
      return `publishing now ([run](${ota.run}))`;
    case 'failed':
      return `FAILED for head ([run](${ota.run}))`;
    case 'current':
      return `live for head, ${central(ota.update.createdAt)} ([update](${updateUrl(ota.update.group)}))`;
    case 'stale':
      return `OLD: built from ${short(ota.update.gitCommitHash)}, head is ${short(head)} ([update](${updateUrl(ota.update.group)}))`;
    case 'missing':
      return 'none published';
  }
};

const installText = (value: Installable): string => {
  switch (value.kind) {
    case 'ready':
      return `dev build ${value.build.appBuildVersion ?? ''} finished ${central(value.build.completedAt)} ([install](${buildUrl(value.build.id)}))`;
    case 'building':
      return `dev build ${value.build.status} since ${central(value.build.createdAt)} ([build](${buildUrl(value.build.id)}))`;
    case 'no-build':
      return 'NO dev build for this runtime';
    case 'unknown':
      return '-';
  }
};

const cell = (text: string) => text.replace(/\|/g, '/');

export const renderLive = (live: Live, ci: Map<number, string>): string => {
  const out = [
    `Generated ${central(live.generatedAt)} Central (${live.generatedAt}) from live GitHub and EAS data.`,
    'Older than 15 minutes means stale: ask a thread to run `make status` before quoting it.',
    '',
  ];
  if (live.eas !== 'ok') out.push(`EAS data unavailable: ${live.eas}`, '');
  out.push(
    '## Open PRs',
    '',
    '| PR | Title | Draft | CI | Merge state | Labels | OTA preview | Installable |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const pr of live.prs)
    out.push(
      `| [#${pr.number}](${pr.url}) | ${cell(pr.title)} | ${pr.draft ? 'draft' : 'ready'} | ${cell(ci.get(pr.number) ?? '-')} | ${pr.mergeable} | ${cell(pr.labels.join(', ')) || '-'} | ${otaText(pr.ota, pr.head)} | ${pr.ota.kind === 'not-app' ? '-' : installText(pr.installable)} |`,
    );
  out.push(
    '',
    '## EAS builds (newest first)',
    '',
    '| Build | For | Status | Started | Finished |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const build of live.builds.slice(0, 10)) {
    const pr = buildPr(build);
    const status = build.error ? `${build.status}: ${cell(build.error.message)}` : build.status;
    out.push(
      `| [${build.buildProfile ?? '?'} ${build.appBuildVersion ?? ''}](${buildUrl(build.id)}) | ${pr ? `PR #${pr}` : cell(build.message ?? '-')} | ${status} | ${central(build.createdAt)} | ${central(build.completedAt)} |`,
    );
  }
  const { staging } = live;
  const stagingRun = staging.run
    ? staging.run.status === 'completed'
      ? (staging.run.conclusion ?? 'done')
      : staging.run.status
    : 'no run (head does not touch the app)';
  out.push(
    '',
    '## Staging OTA',
    '',
    `- staging head ${short(staging.head)}; Mobile preview run on it: ${stagingRun}`,
    `- latest staging update: ${staging.update ? `${short(staging.update.gitCommitHash)} at ${central(staging.update.createdAt)} ([update](${updateUrl(staging.update.group)}))` : 'none'}`,
    '',
    '## Merged into staging in the last 24 h',
    '',
  );
  for (const pr of live.merged)
    out.push(`- #${pr.number} ${pr.title} (${short(pr.sha)}, ${central(pr.mergedAt)})`);
  if (live.merged.length === 0) out.push('- nothing');
  return out.join('\n');
};
