'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  type ChangelogChange,
  type ChangelogEntry,
  type ChangelogEntryInput,
  compareVersions,
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
    console.error('Error fetching changelog:', error);
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
    return { success: false, message: 'Version must look like 1.3.0.' };
  }

  const changes = input.changes
    .map((change) => ({
      title: change.title.trim(),
      description: change.description.trim(),
    }))
    .filter((change) => change.title)
    .map((change) => (change.description ? change : { title: change.title }));

  if (changes.length === 0) {
    return { success: false, message: 'Add at least one change.' };
  }

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
    console.error('Error saving changelog entry:', error);
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
    console.error('Error deleting changelog entry:', error);
    return { success: false, message: error.message };
  }

  revalidatePath('/dashboard/changelog');
  return { success: true };
}
