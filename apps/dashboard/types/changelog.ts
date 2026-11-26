export const CHANGELOG_ICONS = [
  'sparkles',
  'zap',
  'rocket',
  'arrow-up-down',
  'refresh-cw',
  'shield-check',
  'wrench',
  'layout',
  'moon',
  'palette',
  'utensils',
  'calendar',
  'map',
  'map-pin',
  'bell',
  'wifi-off',
] as const;

export type ChangelogIcon = (typeof CHANGELOG_ICONS)[number];

export const isChangelogIcon = (value: unknown): value is ChangelogIcon =>
  typeof value === 'string' && (CHANGELOG_ICONS as readonly string[]).includes(value);

export interface ChangelogChange {
  title: string;
  description: string;
  icon: ChangelogIcon;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  releaseDate: string | null;
  summary: string;
  changes: ChangelogChange[];
  isPublished: boolean;
  updatedAt: string;
}

export interface ChangelogEntryInput {
  id?: string;
  version: string;
  releaseDate: string | null;
  summary: string;
  changes: ChangelogChange[];
  isPublished: boolean;
}

export const isValidVersion = (version: string) => /^\d+\.\d+\.\d+$/.test(version);

export const compareVersions = (a: string, b: string) => {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};
