import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { memo } from 'react';

import FoodComponent from '~/components/FoodComponent';
import type { DrizzleDB } from '~/services/database/database';
import type * as schema from '~/services/database/schema';
import { toggleFavoriteForFood } from '~/utils/foodActions';
import type { FoodRow } from '~/utils/menuRows';

interface FoodItemRowProps {
  item: FoodRow;
  selectedMenu: string;
  location: string;
  date: string;
  db: ExpoSQLiteDatabase<typeof schema>;
  isFavorite: boolean;
  canMealPlan: boolean;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelectMultiple: (id: string) => void;
}

const FoodItemRow = ({
  item,
  selectedMenu,
  location,
  date,
  db,
  isFavorite,
  canMealPlan,
  selecting,
  selected,
  onToggleSelect,
  onSelectMultiple,
}: FoodItemRowProps) => {
  return (
    <FoodComponent
      food={item.data}
      selectedMenu={selectedMenu}
      categoryName={item.categoryId}
      location={location}
      date={date}
      position={item.position}
      canMealPlan={canMealPlan}
      selection={{
        selecting,
        selected,
        onToggleSelect: () => onToggleSelect(item.id),
        onSelectMultiple: () => onSelectMultiple(item.id),
      }}
      onFavorite={async (food) => {
        await toggleFavoriteForFood(db as DrizzleDB, food, {
          location,
          menu: selectedMenu,
          category: item.categoryId,
        });
      }}
      isFavorite={isFavorite}
    />
  );
};

export default memo(FoodItemRow);
