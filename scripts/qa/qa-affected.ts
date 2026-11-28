import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';

export type FlowRule = { match: RegExp; flows: string[] };

export type Selection = { kind: 'all'; reason: string } | { kind: 'some'; flows: string[] };

const TIME = ['central-time', 'hours-and-greeting', 'no-menu-days'];
const MENU = ['central-time', 'no-menu-days', 'past-day-and-selection'];
const MAP = ['map-sheet', 'colloquial-names', 'permissions-map'];
const PERMISSIONS = ['permissions-onboarding', 'permissions-map', 'settings-permissions'];

export const RULES: FlowRule[] = [
  { match: /^apps\/mobile\/e2e\/qa\/([a-z-]+)\.yaml$/, flows: [] },
  { match: /^packages\/core\/src\/(central-time|hours|menu-sync)/, flows: TIME },
  {
    match: /^apps\/mobile\/utils\/(date|time|qaClock|qaClockTarget|homeView|locationStatus)/,
    flows: TIME,
  },
  { match: /^apps\/mobile\/app\/\(tabs\)\/\(home\)\//, flows: TIME },
  { match: /^apps\/mobile\/app\/location\//, flows: MENU },
  { match: /^apps\/mobile\/utils\/(menuList|menuRows|filter)/, flows: MENU },
  { match: /^apps\/mobile\/components\/(FoodComponent|FilterBar|MealStrip)/, flows: MENU },
  {
    match: /^apps\/mobile\/hooks\/(useMultiSelect|useMenuData)/,
    flows: ['past-day-and-selection'],
  },
  {
    match: /^apps\/mobile\/(app\/meal-plan|store\/useMealPlanStore|components\/mealPlan\/)/,
    flows: ['past-day-and-selection'],
  },
  { match: /^apps\/mobile\/app\/\(tabs\)\/(map|search)/, flows: MAP },
  { match: /^apps\/mobile\/components\/map\//, flows: MAP },
  {
    match: /^apps\/mobile\/utils\/(mapSheetView|mapPlaces|mapSearch|search|locations)/,
    flows: MAP,
  },
  { match: /^apps\/mobile\/hooks\/usePermission/, flows: PERMISSIONS },
  { match: /^apps\/mobile\/app\/\(tabs\)\/settings\//, flows: ['settings-permissions'] },
  { match: /^apps\/mobile\/components\/onboarding\//, flows: ['permissions-onboarding'] },
  {
    match:
      /^apps\/mobile\/(services\/rating\/|utils\/ratingPrompt|hooks\/useRatingPromptOnMenuView)/,
    flows: ['rating-prompt'],
  },
  {
    match:
      /^apps\/mobile\/(app\/food\/|app\/location_generic\/|hooks\/(useFoodData|useLocationDetails))/,
    flows: ['missing-screens'],
  },
];

const IGNORED = /(\.test\.ts$|\.md$|^apps\/mobile\/e2e\/(?!qa\/)|^apps\/mobile\/drizzle\/meta\/)/;
const EVERYTHING = /^(apps\/mobile\/|packages\/core\/|scripts\/qa\/|scripts\/dev\/sample\/)/;

export function selectFlows(changed: string[], rules: FlowRule[] = RULES): Selection {
  const flows = new Set<string>();
  for (const file of changed) {
    if (IGNORED.test(file)) continue;
    const rule = rules.find((r) => r.match.test(file));
    if (rule) {
      const own = rule.flows.length === 0 ? [basename(file, '.yaml')] : rule.flows;
      for (const flow of own) {
        if (flow !== 'config') flows.add(flow);
      }
      continue;
    }
    if (EVERYTHING.test(file)) return { kind: 'all', reason: file };
  }
  return { kind: 'some', flows: [...flows].sort() };
}

function changedFiles(base: string): string[] {
  const mergeBase = execFileSync('git', ['merge-base', 'HEAD', base], { encoding: 'utf8' }).trim();
  const committed = execFileSync('git', ['diff', '--name-only', mergeBase], { encoding: 'utf8' });
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
  });
  return [...new Set(`${committed}\n${untracked}`.split('\n').filter(Boolean))];
}

if (process.argv[1] && basename(process.argv[1]) === 'qa-affected.ts') {
  const base = process.argv[2] ?? 'origin/staging';
  const dir = process.argv[3] ?? 'apps/mobile/e2e/qa';
  const selection = selectFlows(changedFiles(base));
  if (selection.kind === 'all') {
    process.stderr.write(`all flows: ${selection.reason} has no narrower rule\n`);
    process.stdout.write(`${dir}\n`);
  } else {
    for (const flow of selection.flows) {
      const path = `${dir}/${flow}.yaml`;
      if (existsSync(path)) process.stdout.write(`${path}\n`);
    }
  }
}
