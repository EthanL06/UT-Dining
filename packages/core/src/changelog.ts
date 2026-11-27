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

export type StoredChangelogChange = {
  icon: ChangelogIcon;
  title: string;
  description?: string;
};

export const isChangelogIcon = (value: unknown): value is ChangelogIcon =>
  typeof value === 'string' && (CHANGELOG_ICONS as readonly string[]).includes(value);

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

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

export const checkChangelogChanges = (
  value: unknown,
  { requireOne = false }: { requireOne?: boolean } = {},
): Checked<StoredChangelogChange[]> => {
  if (!Array.isArray(value)) return { ok: false, error: '"changes" must be a list.' };
  const changes: StoredChangelogChange[] = [];
  for (const [index, change] of value.entries()) {
    const title = typeof change?.title === 'string' ? change.title.trim() : '';
    if (!title) return { ok: false, error: `Change ${index + 1} needs a title.` };
    const icon = change.icon ?? 'sparkles';
    if (!isChangelogIcon(icon)) {
      return {
        ok: false,
        error: `Unknown icon "${icon}". Icons: ${CHANGELOG_ICONS.join(', ')}.`,
      };
    }
    const description = typeof change.description === 'string' ? change.description.trim() : '';
    changes.push(description ? { icon, title, description } : { icon, title });
  }
  if (requireOne && changes.length === 0) return { ok: false, error: 'Add at least one change.' };
  return { ok: true, value: changes };
};
