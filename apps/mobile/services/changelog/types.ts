export interface ChangelogChange {
  title: string;
  description?: string;
}

export interface ChangelogEntry {
  version: string;
  date?: string;
  summary?: string;
  changes: ChangelogChange[];
}
