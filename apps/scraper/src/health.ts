import { iconFlag } from './parse.ts';
import type { Label, MenuPage } from './types.ts';

export type ProblemKind = 'layout' | 'unreachable' | 'mapping';

export interface Problem {
  kind: ProblemKind;
  detail: string;
  locationName?: string;
  date?: string;
  url?: string;
}

export interface HealthReport {
  checkedAt: string;
  dates: string[];
  locationDays: number;
  served: number;
  notPosted: number;
  labels: number;
  blankLabels: number;
  problems: Problem[];
  healthy: boolean;
}

const NO_DATA = /No\s+Data\s+Available/i;
const MIN_ROW_RATIO = 0.5;
const MAX_BLANK_LABEL_RATIO = 0.25;
const MIN_LABELS_FOR_RATIO = 20;

export type ShortMenuStatus = 'menus' | 'not-posted' | 'unrecognized';

export const checkShortMenu = (html: string, mealLinks: string[]): ShortMenuStatus => {
  if (mealLinks.length > 0) return 'menus';
  return NO_DATA.test(html) ? 'not-posted' : 'unrecognized';
};

const labelLinkCount = (html: string) =>
  new Set([...html.matchAll(/label\.aspx[^"'\s>]*/gi)].map((match) => match[0])).size;

export const checkMenuPage = (html: string, page: MenuPage): string | null => {
  const listed = labelLinkCount(html);
  const parsed = page.categories.reduce((sum, category) => sum + category.rows.length, 0);
  if (listed === 0 && parsed === 0) {
    return NO_DATA.test(html) ? null : 'The meal page has no items and no "No Data Available" note';
  }
  if (parsed < listed * MIN_ROW_RATIO) {
    return `The meal page links ${listed} nutrition labels but only ${parsed} items were parsed`;
  }
  if (page.type === 'Unknown') return 'The meal name could not be read from the page header';
  return null;
};

export const unknownIcons = (html: string): string[] => {
  const unknown = new Set<string>();
  for (const match of html.matchAll(/src\s*=\s*["']?([^"'\s>]*LegendImages\/[^"'\s>]+)/gi)) {
    if (!iconFlag(match[1])) unknown.add(match[1].slice(match[1].lastIndexOf('/') + 1));
  }
  return [...unknown];
};

export const isBlankLabel = ({ nutrition }: Label) =>
  nutrition.calories === null &&
  !nutrition.servingSize &&
  !nutrition.ingredients &&
  nutrition.totalFat === null &&
  nutrition.sodium === null &&
  nutrition.protein === null;

export const buildReport = ({
  dates,
  locationDays,
  served,
  notPosted,
  labels,
  blankLabels,
  problems,
  unrecognizedAllergens,
  unknownIconFiles,
  checkedAt = new Date().toISOString(),
}: {
  dates: string[];
  locationDays: number;
  served: number;
  notPosted: number;
  labels: number;
  blankLabels: number;
  problems: Problem[];
  unrecognizedAllergens: Iterable<string>;
  unknownIconFiles: Iterable<string>;
  checkedAt?: string;
}): HealthReport => {
  const all = [...problems];
  if (labels >= MIN_LABELS_FOR_RATIO && blankLabels / labels > MAX_BLANK_LABEL_RATIO) {
    all.push({
      kind: 'layout',
      detail: `${blankLabels} of ${labels} nutrition labels had no nutrition facts`,
    });
  }
  const allergens = [...unrecognizedAllergens];
  if (allergens.length > 0) {
    all.push({
      kind: 'mapping',
      detail: `Nutrition labels list allergens the scraper does not know: ${allergens.join(', ')}`,
    });
  }
  const icons = [...unknownIconFiles];
  if (icons.length > 0) {
    all.push({
      kind: 'mapping',
      detail: `Menus show icons the scraper does not know: ${icons.join(', ')}`,
    });
  }
  return {
    checkedAt,
    dates,
    locationDays,
    served,
    notPosted,
    labels,
    blankLabels,
    problems: all,
    healthy: all.length === 0,
  };
};

const KIND_TITLES: Record<ProblemKind, string> = {
  layout: 'Pages the scraper could not read',
  unreachable: 'Pages that failed to load after retries',
  mapping: 'New allergens or icons',
};

export const formatReport = (report: HealthReport, runUrl?: string): string => {
  const range =
    report.dates.length > 1 ? `${report.dates[0]} to ${report.dates.at(-1)}` : report.dates[0];
  const lines = [
    report.healthy
      ? `The scraper read FoodPro without problems for ${range}.`
      : `The scraper hit ${report.problems.length} problem${report.problems.length === 1 ? '' : 's'} reading FoodPro for ${range}. This usually means UT changed the menu site's layout.`,
    '',
    `- Location-days checked: ${report.locationDays}`,
    `- With menus: ${report.served}`,
    `- No menu posted by UT: ${report.notPosted}`,
    `- Nutrition labels read: ${report.labels} (${report.blankLabels} blank)`,
  ];
  if (runUrl) lines.push(`- Run: ${runUrl}`);
  for (const kind of Object.keys(KIND_TITLES) as ProblemKind[]) {
    const matching = report.problems.filter((problem) => problem.kind === kind);
    if (matching.length === 0) continue;
    lines.push('', `### ${KIND_TITLES[kind]}`, '');
    for (const problem of matching.slice(0, 25)) {
      const where = [problem.locationName, problem.date].filter(Boolean).join(' ');
      const link = problem.url
        ? ` ([page](${problem.url.replaceAll('(', '%28').replaceAll(')', '%29')}))`
        : '';
      lines.push(`- ${where ? `${where}: ` : ''}${problem.detail}${link}`);
    }
    if (matching.length > 25) lines.push(`- and ${matching.length - 25} more`);
  }
  if (!report.healthy) {
    lines.push(
      '',
      'Days where UT posted no menu (FoodPro shows "No Data Available") are expected during breaks and are not counted as problems.',
    );
  }
  return lines.join('\n');
};
