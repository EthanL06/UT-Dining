import { memo } from 'react';

import FoodComponent from '~/components/FoodComponent';
import { useFavoriteActions } from '~/hooks/useFavorites';
import type { FoodRow } from '~/utils/menuRows';

interface FoodItemRowProps {
  item: FoodRow;
  selectedMenu: string;
  location: string;
  date: string;
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
  isFavorite,
  canMealPlan,
  selecting,
  selected,
  onToggleSelect,
  onSelectMultiple,
}: FoodItemRowProps) => {
  const favoriteActions = useFavoriteActions();
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
        await favoriteActions.toggle(food, {
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
