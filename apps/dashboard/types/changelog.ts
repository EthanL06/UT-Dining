import type { ChangelogIcon } from '@ut-dining/core';

export {
  CHANGELOG_ICONS,
  type ChangelogIcon,
  compareVersions,
  isChangelogIcon,
  isValidVersion,
} from '@ut-dining/core';

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
