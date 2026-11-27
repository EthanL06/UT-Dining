import type { ChangelogIcon } from '@ut-dining/core';

export { CHANGELOG_ICONS, type ChangelogIcon } from '@ut-dining/core';

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
