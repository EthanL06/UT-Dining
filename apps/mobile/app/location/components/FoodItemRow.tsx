import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { memo, useEffect, useState } from 'react';

import FoodComponent, { type RowPosition } from '~/components/FoodComponent';
import type { DrizzleDB, FoodItem } from '~/services/database/database';
import type * as schema from '~/services/database/schema';
import { toggleFavoriteForFood } from '~/utils/foodActions';

interface FoodItemProps {
  data: FoodItem;
  categoryId: string;
  id: string;
  hidden?: boolean;
}

interface FoodItemRowProps {
  item: FoodItemProps;
  selectedMenu: string;
  location: string;
  date: string;
  db: ExpoSQLiteDatabase<typeof schema>;
  favorites: schema.Favorite[];
  position: RowPosition;
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
  favorites,
  position,
  selecting,
  selected,
  onToggleSelect,
  onSelectMultiple,
}: FoodItemRowProps) => {
  const foodName = item.data.name;
  const [isFavorite, setIsFavorite] = useState(favorites.some((f) => f.name === foodName));

  useEffect(() => {
    setIsFavorite(favorites.some((f) => f.name === foodName));
  }, [favorites, foodName]);

  return (
    <FoodComponent
      food={item.data}
      selectedMenu={selectedMenu}
      categoryName={item.categoryId}
      location={location}
      date={date}
      position={position}
      selection={{
        selecting,
        selected,
        onToggleSelect: () => onToggleSelect(item.id),
        onSelectMultiple: () => onSelectMultiple(item.id),
      }}
      onFavorite={async (food) => {
        setIsFavorite(!isFavorite);
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
