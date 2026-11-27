import { Link } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { formatGrams, formatNumber } from '~/components/mealPlan/format';
import { CountUpText } from '~/components/motion/CountUpText';
import { RollingNumber } from '~/components/motion/RollingNumber';
import { Image } from '~/components/ui/Image';
import { Text } from '~/components/ui/Text';
import { ALLERGEN_ICONS } from '~/data/AllergenInfo';
import { type MealPlanItem, useMealPlanStore } from '~/store/useMealPlanStore';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

type NutrientKey = 'calories' | 'protein' | 'total_carbohydrates' | 'total_fat';

const amount = (item: MealPlanItem, key: NutrientKey) =>
  (Number.parseFloat(String(item.nutrition?.[key] ?? 0)) || 0) * (item.quantity || 1);

export const PlanRow = ({
  item,
  date,
  editable,
  isFirst,
  onRemove,
}: {
  item: MealPlanItem;
  date: string;
  editable: boolean;
  isFirst: boolean;
  onRemove: (item: MealPlanItem) => void;
}) => {
  const theme = useTheme();
  const updateQuantity = useMealPlanStore((state) => state.updateMealPlanItemQuantity);
  const quantity = item.quantity || 1;
  const allergens = Object.entries(item.allergens || {}).filter(([, value]) => value);

  const step = (delta: number) => {
    const next = Math.round((quantity + delta) * 100) / 100;
    if (next <= 0) {
      onRemove(item);
      return;
    }
    haptics.selection();
    updateQuantity(item.id, Math.min(next, 99), date);
  };

  const href = {
    pathname: '/food/[food]' as const,
    params: {
      food: item.name,
      menu: item.menuName,
      category: item.categoryName,
      location: item.locationName,
      favorite: 'false',
      date,
    },
  };

  return (
    <Link href={href} asChild>
      <Link.Trigger>
        <Pressable
          testID="meal-plan-item"
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${formatNumber(amount(item, 'calories'))} kcal${
            quantity !== 1 ? `, ${quantity} servings` : ''
          }`}
          accessibilityActions={
            editable
              ? [
                  { name: 'increment', label: 'Add one serving' },
                  { name: 'decrement', label: 'Remove one serving' },
                  { name: 'remove', label: 'Remove from Meal Plan' },
                ]
              : []
          }
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'increment') step(1);
            if (nativeEvent.actionName === 'decrement') step(-1);
            if (nativeEvent.actionName === 'remove') onRemove(item);
          }}
        >
          {({ pressed }) => (
            <View
              className="min-h-[64px] flex-row items-center gap-x-3 px-4 py-2.5"
              style={{ backgroundColor: pressed ? theme.fill : theme.card }}
            >
              {!isFirst && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    left: 16,
                    height: 0.5,
                    backgroundColor: theme.separator,
                  }}
                />
              )}
              <View className="flex-1 gap-y-0.5">
                <Text variant="callout" numberOfLines={2}>
                  {item.name}
                </Text>
                <View className="flex-row flex-wrap items-center gap-x-1.5">
                  <Text variant="footnote" tone="secondary">
                    {item.locationName} · {formatGrams(amount(item, 'protein'))} protein ·{' '}
                    {formatGrams(amount(item, 'total_carbohydrates'))} carbs
                  </Text>
                  {allergens.length > 0 && (
                    <View className="flex-row items-center gap-x-1.5">
                      {allergens.map(([key]) => (
                        <Image
                          key={key}
                          source={ALLERGEN_ICONS[key as keyof typeof ALLERGEN_ICONS]}
                          className="size-[15px] rounded-full"
                          contentFit="contain"
                        />
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <View className="items-end gap-y-1">
                <CountUpText
                  variant="subheadline"
                  emphasized
                  value={amount(item, 'calories')}
                  format={formatNumber}
                />
                {editable ? (
                  <View
                    className="h-8 flex-row items-center rounded-full"
                    style={{ backgroundColor: theme.fill }}
                  >
                    <Pressable
                      testID="meal-plan-decrement"
                      accessibilityLabel={
                        quantity <= 1 ? 'Remove from Meal Plan' : 'Remove one serving'
                      }
                      hitSlop={6}
                      onPress={() => step(-1)}
                      className="h-8 w-8 items-center justify-center"
                    >
                      <Minus size={14} color={theme.label} />
                    </Pressable>
                    <RollingNumber
                      value={quantity}
                      variant="subheadline"
                      emphasized
                      testID="meal-plan-quantity"
                      className="min-w-5"
                    />
                    <Pressable
                      accessibilityLabel="Add one serving"
                      hitSlop={6}
                      onPress={() => step(1)}
                      className="h-8 w-8 items-center justify-center"
                    >
                      <Plus size={14} color={theme.label} />
                    </Pressable>
                  </View>
                ) : (
                  <Text variant="footnote" tone="secondary" testID="meal-plan-quantity">
                    {quantity === 1 ? '1 serving' : `${quantity} servings`}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      {editable && (
        <Link.Menu>
          <Link.MenuAction icon="trash" destructive onPress={() => onRemove(item)}>
            Remove from Meal Plan
          </Link.MenuAction>
        </Link.Menu>
      )}
    </Link>
  );
};
