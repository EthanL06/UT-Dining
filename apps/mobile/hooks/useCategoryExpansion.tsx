import { useCallback, useMemo, useState } from 'react';

import type { FoodItem, Location } from '~/services/database/database';
import { log } from '~/utils/log';

export type ListItem =
  | { type: 'category_header'; id: string; title: string; isExpanded: boolean }
  | { type: 'food_item'; id: string; categoryId: string; data: FoodItem; hidden?: boolean }
  | { type: 'skeleton_header'; id: string }
  | { type: 'skeleton_item'; id: string };

export function useCategoryExpansion(data: Location | null) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = useCallback(
    (categoryId: string) => {
      try {
        if (expandedCategories[categoryId] === undefined) {
          setExpandedCategories((prev) => ({ ...prev, [categoryId]: false }));
          return;
        }

        setExpandedCategories((prev) => ({
          ...prev,
          [categoryId]: !prev[categoryId],
        }));
      } catch (error) {
        log.error('Error toggling category', error);
      }
    },
    [expandedCategories],
  );

  const flattenedItems = useMemo(() => {
    if (!data?.menus?.length) return [];

    const items: ListItem[] = [];
    const menu = data.menus[0];

    const categories = menu.menu_categories;

    categories.forEach((category) => {
      const categoryId = `${category.category_title}`;

      const isExpanded = expandedCategories[categoryId] !== false;

      items.push({
        type: 'category_header',
        id: categoryId,
        title: category.category_title as string,
        isExpanded,
      });

      category.food_items.forEach((food, index) => {
        items.push({
          type: 'food_item',
          id: `${categoryId}-${food.name}-${index}`,
          categoryId,
          data: food,
          hidden: !isExpanded,
        });
      });
    });

    return items;
  }, [data?.menus, expandedCategories]);

  const resetExpandedCategories = useCallback(() => {
    try {
      setExpandedCategories({});
    } catch (error) {
      log.error('Error resetting expanded categories', error);
    }
  }, []);

  return { expandedCategories, toggleCategory, flattenedItems, resetExpandedCategories };
}
