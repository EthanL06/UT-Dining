import { Link, router } from 'expo-router';
import { Check, ChevronRight, Heart } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MealPlanIcon } from '~/components/MealPlanIcon';
import { Image } from '~/components/ui/Image';
import { Text } from '~/components/ui/Text';
import { ALLERGEN_ICONS } from '~/data/AllergenInfo';
import type { FoodItem } from '~/services/database/database';
import { todayKey, useIsMealPlanItem } from '~/store/useMealPlanStore';
import { toggleMealPlanForFood } from '~/utils/foodActions';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';
import { displayNutrient } from '~/utils/utils';
import { AddMealPlanAction, FavoriteAction, RemoveAction } from './AnimatedActions';

export type RowPosition = 'single' | 'first' | 'middle' | 'last';

const RADIUS = 26;

const cornerStyle = (position: RowPosition) => ({
  borderTopLeftRadius: position === 'single' || position === 'first' ? RADIUS : 0,
  borderTopRightRadius: position === 'single' || position === 'first' ? RADIUS : 0,
  borderBottomLeftRadius: position === 'single' || position === 'last' ? RADIUS : 0,
  borderBottomRightRadius: position === 'single' || position === 'last' ? RADIUS : 0,
});

type SelectionProps = {
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSelectMultiple: () => void;
};

const FoodComponent = ({
  food,
  selectedMenu,
  categoryName,
  location,
  date,
  onFavorite,
  isFavorite,
  isFavoriteScreen = false,
  showExtraInfo = true,
  canMealPlan = true,
  position = 'single',
  selection,
  subtitle,
}: {
  food: FoodItem;
  selectedMenu: string;
  categoryName: string;
  location: string;
  date?: string;
  onFavorite: (food: FoodItem) => Promise<void>;
  isFavorite: boolean;
  isFavoriteScreen?: boolean;
  showExtraInfo?: boolean;
  canMealPlan?: boolean;
  position?: RowPosition;
  selection?: SelectionProps;
  subtitle?: string;
}) => {
  const planDate = date || todayKey();
  const isMealPlan = useIsMealPlanItem(
    {
      name: food.name as string,
      locationName: location,
      menuName: selectedMenu,
      categoryName,
    },
    planDate,
  );
  const theme = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const context = { location, menu: selectedMenu, category: categoryName, date: planDate };
  const href = {
    pathname: '/food/[food]' as const,
    params: {
      food: food.name as string,
      menu: selectedMenu,
      category: categoryName,
      location,
      favorite: isFavoriteScreen ? 'true' : 'false',
      ...(date ? { date } : {}),
    },
  };
  const isFirstRow = position === 'single' || position === 'first';
  const accessibilityLabel = [
    food.name,
    showExtraInfo ? `${displayNutrient(food.nutrition?.calories)} kcal` : null,
    isFavorite ? 'favorite' : null,
    isMealPlan ? 'in meal plan' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const row = (pressed: boolean) => (
    <View
      className="min-h-[60px] flex-row items-center gap-x-3 px-4 py-2.5"
      style={{ backgroundColor: pressed ? theme.fill : theme.card }}
    >
      {!isFirstRow && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            left: selection?.selecting ? 52 : 16,
            height: 0.5,
            backgroundColor: theme.separator,
          }}
        />
      )}
      {selection?.selecting && (
        <View
          className="size-6 items-center justify-center rounded-full"
          style={
            selection.selected
              ? { backgroundColor: theme.tint }
              : { borderWidth: 1.5, borderColor: theme.tertiaryLabel }
          }
        >
          {selection.selected && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
        </View>
      )}
      <View className="flex-1 gap-y-0.5">
        <Text variant="callout" numberOfLines={2}>
          {food.name}
        </Text>
        {subtitle !== undefined && (
          <Text variant="footnote" tone="secondary">
            {subtitle}
          </Text>
        )}
        {showExtraInfo && subtitle === undefined && (
          <View className="flex-row flex-wrap items-center gap-x-1.5">
            <Text variant="footnote" tone="secondary">
              {displayNutrient(food.nutrition?.calories)} kcal ·{' '}
              {displayNutrient(food.nutrition?.protein)} protein ·{' '}
              {displayNutrient(food.nutrition?.total_carbohydrates)} carbs ·{' '}
              {displayNutrient(food.nutrition?.total_fat)} fat
            </Text>
            {food.allergens &&
              Object.entries(food.allergens).map(([key, value]) =>
                value === true ? (
                  <Image
                    key={key}
                    source={ALLERGEN_ICONS[key as keyof typeof ALLERGEN_ICONS]}
                    className="size-[15px] rounded-full"
                    contentFit="contain"
                  />
                ) : null,
              )}
          </View>
        )}
      </View>
      {showExtraInfo && isFavorite && <Heart size={15} color={theme.tint} fill={theme.tint} />}
      {showExtraInfo && isMealPlan && <MealPlanIcon size={15} color={theme.tint} filled />}
      {!selection?.selecting && <ChevronRight size={17} color={theme.tertiaryLabel} />}
    </View>
  );

  const content = selection?.selecting ? (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selection.selected }}
      onPress={() => {
        haptics.selection();
        selection.onToggleSelect();
      }}
    >
      {({ pressed }) => row(pressed)}
    </Pressable>
  ) : (
    <Link href={href} asChild>
      <Link.Trigger withAppleZoom>
        <Pressable>{({ pressed }) => row(pressed)}</Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        {canMealPlan && (
          <Link.MenuAction
            icon={isMealPlan ? 'minus.circle' : 'fork.knife'}
            onPress={() => toggleMealPlanForFood(food, context)}
          >
            {isMealPlan ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
          </Link.MenuAction>
        )}
        <Link.MenuAction
          icon={isFavorite ? 'heart.slash' : 'heart'}
          onPress={() => onFavorite(food)}
        >
          {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </Link.MenuAction>
        {selection && (
          <Link.Menu inline>
            <Link.MenuAction icon="checkmark.circle" onPress={selection.onSelectMultiple}>
              Select Multiple
            </Link.MenuAction>
          </Link.Menu>
        )}
      </Link.Menu>
    </Link>
  );

  return (
    <View className="mx-4 overflow-hidden" style={cornerStyle(position)}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!selection?.selecting}
        containerStyle={{ backgroundColor: theme.card }}
        enableTrackpadTwoFingerGesture
        friction={1.5}
        overshootFriction={200}
        animationOptions={{
          damping: 1,
          stiffness: 11,
          mass: 0.1,
          restDisplacementThreshold: 0.005,
          restSpeedThreshold: 0.005,
        }}
        onSwipeableWillOpen={(direction) => {
          const removing = direction === SwipeDirection.RIGHT ? isMealPlan : isFavorite;
          if (removing) haptics.remove();
          else haptics.success();
        }}
        onSwipeableOpen={async (direction) => {
          swipeableRef.current?.close();

          if (direction === SwipeDirection.RIGHT && canMealPlan) {
            toggleMealPlanForFood(food, context);
          } else if (direction === SwipeDirection.LEFT) {
            await onFavorite(food);
          }
        }}
        overshootLeft={!canMealPlan}
        leftThreshold={canMealPlan ? 50 : Number.MAX_VALUE}
        rightThreshold={100}
        dragOffsetFromLeft={canMealPlan ? 50 : Number.MAX_VALUE}
        renderRightActions={(progress) =>
          isFavorite ? <RemoveAction progress={progress} /> : <FavoriteAction progress={progress} />
        }
        renderLeftActions={(progress) =>
          canMealPlan ? (
            isMealPlan ? (
              <RemoveAction progress={progress} />
            ) : (
              <AddMealPlanAction progress={progress} />
            )
          ) : null
        }
      >
        {selection?.selecting ? (
          content
        ) : (
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityActions={[
              { name: 'activate' },
              ...(canMealPlan
                ? [
                    {
                      name: 'mealPlan',
                      label: isMealPlan ? 'Remove from Meal Plan' : 'Add to Meal Plan',
                    },
                  ]
                : []),
              {
                name: 'favorite',
                label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
              },
            ]}
            onAccessibilityAction={({ nativeEvent }) => {
              if (nativeEvent.actionName === 'activate') router.push(href);
              if (nativeEvent.actionName === 'mealPlan') toggleMealPlanForFood(food, context);
              if (nativeEvent.actionName === 'favorite') void onFavorite(food);
            }}
          >
            {content}
          </View>
        )}
      </ReanimatedSwipeable>
    </View>
  );
};

export default FoodComponent;
