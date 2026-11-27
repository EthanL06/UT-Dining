import { useCallback, useMemo, useState } from 'react';

import type { Location } from '~/services/database/database';
import { type MenuRow, type MenuSource, type RowCache, toMenuSource } from '~/utils/menuRows';

export type ListItem =
  | MenuRow
  | { type: 'skeleton_header'; id: string }
  | { type: 'skeleton_item'; id: string };

const EMPTY_SOURCE: MenuSource = [];

export function useCategoryExpansion(data: Location | null) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const resetExpandedCategories = useCallback(() => {
    setCollapsed((previous) => (previous.size === 0 ? previous : new Set()));
  }, []);

  const categories = data?.menus?.[0]?.menu_categories;
  const { source, cache } = useMemo(
    () => ({
      source: categories ? toMenuSource(categories) : EMPTY_SOURCE,
      cache: new Map() as RowCache,
    }),
    [categories],
  );

  return { collapsed, toggleCategory, resetExpandedCategories, source, cache };
}
