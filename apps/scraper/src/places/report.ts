export type PlaceProblemKind = 'layout' | 'unreachable' | 'new' | 'gone' | 'missing';

export interface PlaceProblem {
  kind: PlaceProblemKind;
  detail: string;
  url?: string;
}

export interface PlaceChange {
  location: string;
  fields: string[];
  detail: string[];
}

export interface PlacesReport {
  checkedAt: string;
  today: string;
  synced: number;
  changes: PlaceChange[];
  problems: PlaceProblem[];
  healthy: boolean;
  failed: boolean;
}

const TITLES: Record<PlaceProblemKind, string> = {
  layout: 'Pages the scraper could not read',
  unreachable: 'Pages that failed to load after retries',
  new: 'New on UT’s sites, not synced yet',
  gone: 'No longer listed by UT',
  missing: 'Synced places missing from the app',
};

const ADVICE: Partial<Record<PlaceProblemKind, string>> = {
  new: 'Add each one with `pnpm -s admin locations add` and a line in `apps/scraper/src/places/sources.ts`.',
  gone: 'Check whether the place closed. If it did, remove it from the app and from `apps/scraper/src/places/sources.ts`.',
  missing:
    'The name in `sources.ts` matches no location in the database. Add the location, or fix the name in `sources.ts`.',
};

export const buildPlacesReport = ({
  today,
  synced,
  changes,
  problems,
  checkedAt = new Date().toISOString(),
}: {
  today: string;
  synced: number;
  changes: PlaceChange[];
  problems: PlaceProblem[];
  checkedAt?: string;
}): PlacesReport => ({
  checkedAt,
  today,
  synced,
  changes,
  problems,
  healthy: problems.length === 0,
  failed: problems.some((problem) => problem.kind === 'layout' || problem.kind === 'unreachable'),
});

const link = (url?: string) =>
  url ? ` ([page](${url.replaceAll('(', '%28').replaceAll(')', '%29')}))` : '';

export const formatPlacesReport = (report: PlacesReport, runUrl?: string): string => {
  const lines = [
    report.healthy
      ? `The scraper read UT's restaurant, café, market and food truck pages without problems for the week of ${report.today}.`
      : `The scraper found ${report.problems.length} thing${report.problems.length === 1 ? '' : 's'} to check on UT's restaurant, café, market and food truck pages for the week of ${report.today}.`,
    '',
    `- Places synced: ${report.synced}`,
    `- Places whose hours or payment methods changed this run: ${report.changes.length}`,
  ];
  if (runUrl) lines.push(`- Run: ${runUrl}`);
  for (const kind of Object.keys(TITLES) as PlaceProblemKind[]) {
    const matching = report.problems.filter((problem) => problem.kind === kind);
    if (matching.length === 0) continue;
    lines.push('', `### ${TITLES[kind]}`, '');
    for (const problem of matching.slice(0, 40))
      lines.push(`- ${problem.detail}${link(problem.url)}`);
    if (matching.length > 40) lines.push(`- and ${matching.length - 40} more`);
    const advice = ADVICE[kind];
    if (advice) lines.push('', advice);
  }
  return lines.join('\n');
};
