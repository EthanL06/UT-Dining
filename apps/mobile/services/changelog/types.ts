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

export interface ChangelogChange {
  title: string;
  description?: string;
  icon: ChangelogIcon;
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  summary?: string;
  changes: ChangelogChange[];
}
