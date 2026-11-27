'use server';

import { checkChangelogChanges } from '@ut-dining/core';
import { revalidatePath } from 'next/cache';
import { log } from '@/lib/log';
import { createClient } from '@/lib/supabase/server';
import {
  type ChangelogChange,
  type ChangelogEntry,
  type ChangelogEntryInput,
  compareVersions,
  isChangelogIcon,
  isValidVersion,
} from '@/types/changelog';

type ActionResult = { success: true } | { success: false; message: string };

const toChanges = (value: unknown): ChangelogChange[] =>
  Array.isArray(value)
    ? value.flatMap((change) =>
        change && typeof change === 'object' && typeof change.title === 'string'
          ? [
              {
                title: change.title,
                description: typeof change.description === 'string' ? change.description : '',
                icon: isChangelogIcon(change.icon) ? change.icon : 'sparkles',
              },
            ]
          : [],
      )
    : [];

export async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('changelog')
    .select('id, version, release_date, summary, changes, is_published, updated_at');

  if (error) {
    log.error('Error fetching changelog:', error);
    return [];
  }

  return data
    .map((row) => ({
      id: row.id,
      version: row.version,
      releaseDate: row.release_date,
      summary: row.summary ?? '',
      changes: toChanges(row.changes),
      isPublished: row.is_published,
      updatedAt: row.updated_at,
    }))
    .sort((a, b) => compareVersions(b.version, a.version));
}

export async function saveChangelogEntry(input: ChangelogEntryInput): Promise<ActionResult> {
  const version = input.version.trim();
  if (!isValidVersion(version)) {
    return { success: false, message: 'Version must look like 2.0.0.' };
  }

  const checked = checkChangelogChanges(
    input.changes.filter((change) => change.title.trim()),
    { requireOne: true },
  );
  if (!checked.ok) return { success: false, message: checked.error };
  const changes = checked.value;

  const row = {
    version,
    release_date: input.releaseDate || null,
    summary: input.summary.trim() || null,
    changes,
    is_published: input.isPublished,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const { error } = input.id
    ? await supabase.from('changelog').update(row).eq('id', input.id)
    : await supabase.from('changelog').insert(row);

  if (error) {
    log.error('Error saving changelog entry:', error);
    return {
      success: false,
      message: error.code === '23505' ? `Version ${version} already has an entry.` : error.message,
    };
  }

  revalidatePath('/dashboard/changelog');
  return { success: true };
}

export async function deleteChangelogEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('changelog').delete().eq('id', id);

  if (error) {
    log.error('Error deleting changelog entry:', error);
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/changelog');
  return { success: true };
}
