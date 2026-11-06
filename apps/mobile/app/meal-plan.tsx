import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { ChefHat, ChevronLeft, Flame, Minus, Plus } from 'lucide-react-native';
import { useRef } from 'react';
import { Image, Alert as NativeAlert, Pressable, ScrollView, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Notifier } from 'react-native-notifier';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Alert from '~/components/Alert';
import { RemoveAction } from '~/components/AnimatedActions';
import { ALLERGEN_ICONS } from '~/data/AllergenInfo';
import { type MealPlanItem, useMealPlanStore } from '~/store/useMealPlanStore';
import { type Theme, useTheme } from '~/utils/theme';
import { displayNutrient } from '~/utils/utils';

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner'];

const amount = (item: MealPlanItem, key: 'calories' | 'protein' | 'total_carbohydrates') =>
  (Number.parseFloat(String(item.nutrition?.[key] ?? 0)) || 0) * (item.quantity || 1);

const sum = (items: MealPlanItem[], key: 'calories' | 'protein' | 'total_carbohydrates') =>
  items.reduce((total, item) => total + amount(item, key), 0);

const formatGrams = (value: number) => `${Math.round(value * 10) / 10}g`;

const Tile = ({ label, value, theme }: { label: string; value: string; theme: Theme }) => (
  <View
    className="flex-1 px-3.5 py-3"
    style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
  >
    <Text className="text-[12.5px]" style={{ color: theme.secondaryLabel }}>
      {label}
    </Text>
    <Text className="font-bold text-[21px]" style={{ color: theme.label }}>
      {value}
    </Text>
  </View>
);

const removeItem = (item: MealPlanItem) => {
  useMealPlanStore.getState().removeMealPlanItem(item.name || '');
  Notifier.showNotification({
    title: `${item.name} removed from today's meal plan!`,
    description: 'You removed this item from your meal plan.',
    swipeEnabled: true,
    Component: Alert,
  });
};

const PlanRow = ({ item, isFirst }: { item: MealPlanItem; isFirst: boolean }) => {
  const theme = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const updateQuantity = useMealPlanStore((state) => state.updateMealPlanItemQuantity);
  const quantity = item.quantity || 1;
  const allergens = Object.entries(item.allergens || {}).filter(([, value]) => value);

  const step = (delta: number) => {
    Haptics.selectionAsync();
    const next = Math.round((quantity + delta) * 100) / 100;
    if (next <= 0) removeItem(item);
    else updateQuantity(item.name || '', Math.min(next, 99));
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      containerStyle={{ backgroundColor: theme.card }}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={50}
      rightThreshold={0}
      renderRightActions={() => null}
      renderLeftActions={(progress) => <RemoveAction progress={progress} />}
      onSwipeableWillClose={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }}
      onSwipeableOpen={() => {
        swipeableRef.current?.close();
        removeItem(item);
      }}
    >
      <View
        accessible
        accessibilityLabel={`${item.name}, ${displayNutrient(String(Math.round(amount(item, 'calories'))))} kcal`}
        accessibilityActions={[
          { name: 'increment', label: 'Add one serving' },
          { name: 'decrement', label: 'Remove one serving' },
        ]}
        onAccessibilityAction={({ nativeEvent }) =>
          step(nativeEvent.actionName === 'increment' ? 1 : -1)
        }
        className="min-h-[64px] flex-row items-center gap-x-3 px-4 py-2.5"
        style={{ backgroundColor: theme.card }}
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
          <Text numberOfLines={2} className="text-[16px]" style={{ color: theme.label }}>
            {item.name}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-1.5">
            <Text className="text-[13.5px]" style={{ color: theme.secondaryLabel }}>
              {item.locationName} · {formatGrams(amount(item, 'protein'))} protein ·{' '}
              {formatGrams(amount(item, 'total_carbohydrates'))} carbs
            </Text>
            {allergens.map(([key]) => (
              <Image
                key={key}
                source={ALLERGEN_ICONS[key as keyof typeof ALLERGEN_ICONS]}
                className="size-[15px] rounded-full"
                resizeMode="contain"
              />
            ))}
          </View>
        </View>
        <View className="items-end gap-y-1">
          <Text className="font-semibold text-[15px]" style={{ color: theme.label }}>
            {Math.round(amount(item, 'calories'))}
          </Text>
          <View
            className="h-8 flex-row items-center rounded-full"
            style={{ backgroundColor: theme.fill }}
          >
            <Pressable
              accessibilityLabel="Remove one serving"
              hitSlop={6}
              onPress={() => step(-1)}
              className="h-8 w-8 items-center justify-center"
            >
              <Minus size={14} color={theme.label} />
            </Pressable>
            <Text
              testID="meal-plan-quantity"
              className="min-w-5 text-center font-semibold text-[14px]"
              style={{ color: theme.label }}
            >
              {quantity}
            </Text>
            <Pressable
              accessibilityLabel="Add one serving"
              hitSlop={6}
              onPress={() => step(1)}
              className="h-8 w-8 items-center justify-center"
            >
              <Plus size={14} color={theme.label} />
            </Pressable>
          </View>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
};

const MealPlan = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const items = useMealPlanStore((state) => state.mealPlanItems);
  const clearMealPlan = useMealPlanStore((state) => state.clearMealPlan);

  const meals = [...new Set(items.map((item) => item.menuName || 'Other'))].sort(
    (a, b) =>
      (MEAL_ORDER.indexOf(a) + 1 || 99) - (MEAL_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b),
  );

  const confirmReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    NativeAlert.alert("Reset today's meal plan?", 'This removes every item from today.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          clearMealPlan();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Meal Plan', headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable
            testID="back-button"
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={() => router.back()}
            className="size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.card }}
          >
            <ChevronLeft size={22} color={theme.label} />
          </Pressable>
          {items.length > 0 && (
            <Pressable
              testID="meal-plan-reset-button"
              accessibilityRole="button"
              onPress={confirmReset}
              className="h-11 justify-center rounded-full px-4"
              style={{ backgroundColor: theme.card }}
            >
              <Text className="font-semibold text-[16px]" style={{ color: theme.tint }}>
                Reset
              </Text>
            </Pressable>
          )}
        </View>

        <Text
          testID="meal-plan-title"
          className="px-5 pt-3 pb-1 font-bold text-[34px]"
          style={{ color: theme.label }}
        >
          Meal Plan
        </Text>
        <Text className="px-5 pb-4 text-[15px]" style={{ color: theme.secondaryLabel }}>
          Today's plan. It starts over at midnight.
        </Text>

        {items.length === 0 ? (
          <View className="mx-8 mt-12 items-center gap-y-2">
            <ChefHat size={36} color={theme.tertiaryLabel} />
            <Text className="font-semibold text-[17px]" style={{ color: theme.label }}>
              Empty Meal Plan!
            </Text>
            <Text className="text-center text-[15px]" style={{ color: theme.secondaryLabel }}>
              Press and hold a food on any menu, or swipe right on it, to add it here.
            </Text>
          </View>
        ) : (
          <>
            <View className="mx-4 mb-2">
              <View
                className="flex-row items-center justify-between px-4 py-3.5"
                style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
              >
                <View>
                  <Text className="text-[12.5px]" style={{ color: theme.secondaryLabel }}>
                    Total for the day
                  </Text>
                  <Text className="font-bold text-[38px]" style={{ color: theme.label }}>
                    {Math.round(sum(items, 'calories'))}
                    <Text
                      className="font-medium text-[16px]"
                      style={{ color: theme.secondaryLabel }}
                    >
                      {' '}
                      kcal
                    </Text>
                  </Text>
                </View>
                <Flame size={32} color={theme.tint} fill={theme.tint} />
              </View>
            </View>
            <View className="mx-4 mb-5 flex-row gap-x-2">
              <Tile label="Protein" value={formatGrams(sum(items, 'protein'))} theme={theme} />
              <Tile
                label="Carbs"
                value={formatGrams(sum(items, 'total_carbohydrates'))}
                theme={theme}
              />
              <Tile
                label="Items"
                value={String(items.reduce((total, item) => total + (item.quantity || 1), 0))}
                theme={theme}
              />
            </View>

            {meals.map((meal) => {
              const mealItems = items.filter((item) => (item.menuName || 'Other') === meal);
              return (
                <View key={meal} className="mb-5">
                  <View className="mx-9 mb-1.5 flex-row justify-between">
                    <Text className="text-[13px]" style={{ color: theme.secondaryLabel }}>
                      {meal}
                    </Text>
                    <Text className="text-[13px]" style={{ color: theme.secondaryLabel }}>
                      {Math.round(sum(mealItems, 'calories'))} kcal
                    </Text>
                  </View>
                  <View
                    className="mx-4 overflow-hidden"
                    style={{ borderRadius: 26, borderCurve: 'continuous' }}
                  >
                    {mealItems.map((item, index) => (
                      <PlanRow
                        key={`${item.name}-${item.categoryName}-${item.menuName}`}
                        item={item}
                        isFirst={index === 0}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default MealPlan;
