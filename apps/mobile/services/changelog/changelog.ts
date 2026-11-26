import type { Json } from '@ut-dining/supabase';
import { supabase } from '~/utils/supabase';
import { isNewerVersion } from '~/utils/version';
import {
  CHANGELOG_ICONS,
  type ChangelogChange,
  type ChangelogEntry,
  type ChangelogIcon,
} from './types';

const isChangelogIcon = (value: unknown): value is ChangelogIcon =>
  typeof value === 'string' && (CHANGELOG_ICONS as readonly string[]).includes(value);

const parseChanges = (changes: Json): ChangelogChange[] => {
  if (!Array.isArray(changes)) return [];

  return changes.flatMap((change) => {
    if (!change || typeof change !== 'object' || Array.isArray(change)) return [];
    const title = typeof change.title === 'string' ? change.title.trim() : '';
    if (!title) return [];
    const description =
      typeof change.description === 'string' && change.description.trim()
        ? change.description.trim()
        : undefined;
    const icon = isChangelogIcon(change.icon) ? change.icon : 'sparkles';
    return [{ title, description, icon }];
  });
};

export const sortChangelog = (entries: ChangelogEntry[]) =>
  [...entries].sort((a, b) => {
    if (isNewerVersion(a.version, b.version)) return 1;
    if (isNewerVersion(b.version, a.version)) return -1;
    return 0;
  });

export const fetchChangelog = async (): Promise<ChangelogEntry[]> => {
  const { data, error } = await supabase
    .from('changelog')
    .select('version, release_date, summary, changes')
    .eq('is_published', true);

  if (error) throw error;

  return sortChangelog(
    data.map((row) => ({
      version: row.version,
      date: row.release_date ?? undefined,
      summary: row.summary?.trim() || undefined,
      changes: parseChanges(row.changes),
    })),
  );
};
