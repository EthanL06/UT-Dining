export interface ChangelogChange {
  title: string;
  description: string;
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
