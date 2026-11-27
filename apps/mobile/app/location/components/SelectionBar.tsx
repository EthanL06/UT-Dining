import { ChefHat, Heart } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import { useTheme } from '~/utils/theme';
import { displayNutrient } from '~/utils/utils';

type Props = {
  count: number;
  calories: number;
  canMealPlan: boolean;
  onFavorite: () => void;
  onAddToMealPlan: () => void;
};

const SelectionBar = ({ count, calories, canMealPlan, onFavorite, onAddToMealPlan }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const empty = count === 0;

  return (
    <View
      className="absolute right-4 left-4 flex-row items-center gap-x-2 rounded-full p-2"
      style={{
        bottom: insets.bottom + 8,
        backgroundColor: theme.card,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      {canMealPlan ? (
        <>
          <PressableScale
            testID="select-favorite-button"
            accessibilityLabel="Add selected to favorites"
            accessibilityRole="button"
            disabled={empty}
            onPress={onFavorite}
            className="size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.fill }}
          >
            <Heart size={20} color={theme.label} />
          </PressableScale>
          <PressableScale
            testID="select-add-meal-plan-button"
            accessibilityRole="button"
            disabled={empty}
            onPress={onAddToMealPlan}
            containerStyle={{ flex: 1 }}
            className="h-11 flex-row items-center justify-center gap-x-2 rounded-full"
            style={{ backgroundColor: theme.tint, opacity: empty ? 0.5 : 1 }}
          >
            <ChefHat size={18} color="#FFFFFF" />
            <Text variant="subheadline" emphasized tone="onTint">
              {empty
                ? 'Select items'
                : `Add ${count} to Meal Plan · ${displayNutrient(String(Math.round(calories)))} kcal`}
            </Text>
          </PressableScale>
        </>
      ) : (
        <PressableScale
          testID="select-favorite-button"
          accessibilityRole="button"
          disabled={empty}
          onPress={onFavorite}
          containerStyle={{ flex: 1 }}
          className="h-11 flex-row items-center justify-center gap-x-2 rounded-full"
          style={{ backgroundColor: theme.tint, opacity: empty ? 0.5 : 1 }}
        >
          <Heart size={18} color="#FFFFFF" />
          <Text variant="subheadline" emphasized tone="onTint">
            {empty ? 'Select items' : `Add ${count} to Favorites`}
          </Text>
        </PressableScale>
      )}
    </View>
  );
};

export default SelectionBar;
