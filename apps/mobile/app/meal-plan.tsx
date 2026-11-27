import { formatCentralDateKey } from '@ut-dining/core';
import { router, Stack } from 'expo-router';
import { ChefHat, ChevronLeft, ChevronRight, Flame, Minus, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Alert as NativeAlert, Pressable, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RemoveAction } from '~/components/AnimatedActions';
import { Image } from '~/components/ui/Image';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { ALLERGEN_ICONS } from '~/data/AllergenInfo';
import {
  type MealPlanItem,
  sumNutrient,
  todayKey,
  useMealPlanDates,
  useMealPlanItems,
  useMealPlanStore,
} from '~/store/useMealPlanStore';
import { formatDateForDisplay } from '~/utils/date';
import { haptics } from '~/utils/haptics';
import { type Theme, useTheme } from '~/utils/theme';

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner'];

type NutrientKey = 'calories' | 'protein' | 'total_carbohydrates' | 'total_fat';

const amount = (item: MealPlanItem, key: NutrientKey) =>
  (Number.parseFloat(String(item.nutrition?.[key] ?? 0)) || 0) * (item.quantity || 1);

const formatNumber = (value: number, digits = 0) =>
  value.toLocaleString('en-US', { maximumFractionDigits: digits });

const formatGrams = (value: number) => `${formatNumber(value, 1)}g`;

const useToday = () => {
  const [today, setToday] = useState(todayKey());

  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const interval = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return today;
};

const formatPlanDay = (date: string) => {
  const label = formatDateForDisplay(date);
  if (['Today', 'Yesterday', 'Tomorrow'].includes(label)) return label;
  return formatCentralDateKey(date, { weekday: 'long', month: 'short', day: 'numeric' });
};

const Tile = ({ label, value, theme }: { label: string; value: string; theme: Theme }) => (
  <View
    className="flex-1 px-3.5 py-3"
    style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
  >
    <Text variant="caption" tone="secondary">
      {label}
    </Text>
    <Text variant="title3">{value}</Text>
  </View>
);

const DayArrow = ({
  testID,
  label,
  target,
  onPress,
  children,
}: {
  testID: string;
  label: string;
  target: string | null;
  onPress: (date: string) => void;
  children: React.ReactNode;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !target }}
      disabled={!target}
      hitSlop={8}
      onPress={() => target && onPress(target)}
      className="size-9 items-center justify-center rounded-full"
      style={{ backgroundColor: theme.card, opacity: target ? 1 : 0.4 }}
    >
      {children}
    </Pressable>
  );
};

const PlanRow = ({
  item,
  date,
  editable,
  isFirst,
}: {
  item: MealPlanItem;
  date: string;
  editable: boolean;
  isFirst: boolean;
}) => {
  const theme = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const updateQuantity = useMealPlanStore((state) => state.updateMealPlanItemQuantity);
  const removeItem = useMealPlanStore((state) => state.removeMealPlanItem);
  const quantity = item.quantity || 1;
  const allergens = Object.entries(item.allergens || {}).filter(([, value]) => value);

  const step = (delta: number) => {
    haptics.selection();
    const next = Math.round((quantity + delta) * 100) / 100;
    if (next <= 0) removeItem(item.id, date);
    else updateQuantity(item.id, Math.min(next, 99), date);
  };

  const openFood = () => {
    router.push({
      pathname: '/food/[food]',
      params: {
        food: item.name,
        menu: item.menuName,
        category: item.categoryName,
        location: item.locationName,
        favorite: 'false',
        date,
      },
    });
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      enabled={editable}
      containerStyle={{ backgroundColor: theme.card }}
      overshootLeft={false}
      overshootRight={false}
      leftThreshold={50}
      rightThreshold={0}
      renderRightActions={() => null}
      renderLeftActions={(progress) => <RemoveAction progress={progress} />}
      onSwipeableWillOpen={() => {
        haptics.remove();
      }}
      onSwipeableOpen={() => {
        swipeableRef.current?.close();
        removeItem(item.id, date);
      }}
    >
      <Pressable
        testID="meal-plan-item"
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatNumber(amount(item, 'calories'))} kcal${
          quantity !== 1 ? `, ${quantity} servings` : ''
        }`}
        accessibilityActions={[
          { name: 'activate' },
          ...(editable
            ? [
                { name: 'increment', label: 'Add one serving' },
                { name: 'decrement', label: 'Remove one serving' },
              ]
            : []),
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'activate') openFood();
          if (nativeEvent.actionName === 'increment') step(1);
          if (nativeEvent.actionName === 'decrement') step(-1);
        }}
        onPress={openFood}
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
                {allergens.map(([key]) => (
                  <Image
                    key={key}
                    source={ALLERGEN_ICONS[key as keyof typeof ALLERGEN_ICONS]}
                    className="size-[15px] rounded-full"
                    contentFit="contain"
                  />
                ))}
              </View>
            </View>
            <View className="items-end gap-y-1">
              <Text variant="subheadline" emphasized>
                {formatNumber(amount(item, 'calories'))}
              </Text>
              {editable ? (
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
                    variant="subheadline"
                    emphasized
                    testID="meal-plan-quantity"
                    className="min-w-5 text-center"
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
              ) : (
                <Text variant="footnote" tone="secondary" testID="meal-plan-quantity">
                  {quantity === 1 ? '1 serving' : `${quantity} servings`}
                </Text>
              )}
            </View>
          </View>
        )}
      </Pressable>
    </ReanimatedSwipeable>
  );
};

type ViewedDay = { kind: 'today' } | { kind: 'date'; date: string };

const MealPlan = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [viewing, setViewing] = useState<ViewedDay>({ kind: 'today' });
  const selectedDate = viewing.kind === 'today' ? today : viewing.date;

  const items = useMealPlanItems(selectedDate);
  const planDates = useMealPlanDates();
  const clearMealPlan = useMealPlanStore((state) => state.clearMealPlan);
  const days = useMemo(
    () => Array.from(new Set([...planDates, today, selectedDate])).sort(),
    [planDates, today, selectedDate],
  );
  const dayIndex = days.indexOf(selectedDate);
  const previousDay = dayIndex > 0 ? days[dayIndex - 1] : null;
  const nextDay = dayIndex < days.length - 1 ? days[dayIndex + 1] : null;
  const editable = selectedDate >= today;
  const dayLabel = formatPlanDay(selectedDate);

  const meals = [...new Set(items.map((item) => item.menuName || 'Other'))].sort(
    (a, b) =>
      (MEAL_ORDER.indexOf(a) + 1 || 99) - (MEAL_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b),
  );

  const goTo = (date: string) => {
    if (date === selectedDate) return;
    haptics.selection();
    setViewing(date === today ? { kind: 'today' } : { kind: 'date', date });
  };

  const confirmReset = () => {
    const day = selectedDate === today ? "today's" : `${dayLabel}'s`;
    NativeAlert.alert(`Reset ${day} meal plan?`, 'This removes every item from this day.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          clearMealPlan(selectedDate);
          haptics.success();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Meal Plan', headerShown: false }} />
      <OverflowScrollView
        divider={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
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
          {editable && items.length > 0 && (
            <Pressable
              testID="meal-plan-reset-button"
              accessibilityRole="button"
              onPress={confirmReset}
              className="h-11 justify-center rounded-full px-4"
              style={{ backgroundColor: theme.card }}
            >
              <Text variant="callout" emphasized tone="tint">
                Reset
              </Text>
            </Pressable>
          )}
        </View>

        <Text variant="largeTitle" testID="meal-plan-title" className="px-5 pt-3 pb-1">
          Meal Plan
        </Text>
        <Text variant="subheadline" paragraph tone="secondary" className="px-5 pb-4">
          Each day keeps its own plan, so you can look back on what you ate.
        </Text>

        <View className="mx-4 mb-3 flex-row items-center gap-x-2">
          <DayArrow
            testID="meal-plan-previous-day"
            label="Previous day"
            target={previousDay}
            onPress={goTo}
          >
            <ChevronLeft size={18} color={theme.label} />
          </DayArrow>
          <Pressable
            testID="meal-plan-day"
            accessibilityRole="button"
            accessibilityHint={selectedDate !== today ? 'Goes back to today' : undefined}
            disabled={selectedDate === today}
            onPress={() => goTo(today)}
            className="h-9 flex-1 flex-row items-center justify-center gap-x-1.5"
          >
            <Text variant="headline">{dayLabel}</Text>
            {selectedDate !== today && (
              <Text variant="subheadline" tone="tint">
                · Back to today
              </Text>
            )}
          </Pressable>
          <DayArrow testID="meal-plan-next-day" label="Next day" target={nextDay} onPress={goTo}>
            <ChevronRight size={18} color={theme.label} />
          </DayArrow>
        </View>

        {items.length === 0 ? (
          <View className="mx-8 mt-12 items-center gap-y-2">
            <ChefHat size={36} color={theme.tertiaryLabel} />
            <Text variant="headline">{editable ? 'Empty Meal Plan!' : 'Nothing logged'}</Text>
            <Text variant="subheadline" paragraph tone="secondary" className="text-center">
              {editable
                ? 'Press and hold a food on any menu, or swipe right on it, to add it here.'
                : 'You had nothing in your meal plan this day.'}
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
                  <Text variant="caption" tone="secondary">
                    Total for the day
                  </Text>
                  <Text variant="display">
                    {formatNumber(sumNutrient(items, 'calories'))}
                    <Text variant="callout" tone="secondary">
                      {' '}
                      kcal
                    </Text>
                  </Text>
                </View>
                <Flame size={32} color={theme.tint} fill={theme.tint} />
              </View>
            </View>
            <View className="mx-4 mb-5 flex-row gap-x-2">
              <Tile
                label="Protein"
                value={formatGrams(sumNutrient(items, 'protein'))}
                theme={theme}
              />
              <Tile
                label="Carbs"
                value={formatGrams(sumNutrient(items, 'total_carbohydrates'))}
                theme={theme}
              />
              <Tile
                label="Fat"
                value={formatGrams(sumNutrient(items, 'total_fat'))}
                theme={theme}
              />
            </View>

            {meals.map((meal) => {
              const mealItems = items.filter((item) => (item.menuName || 'Other') === meal);
              return (
                <View key={meal} className="mb-5">
                  <View className="mx-9 mb-1.5 flex-row justify-between">
                    <Text variant="footnote" tone="secondary">
                      {meal}
                    </Text>
                    <Text variant="footnote" tone="secondary">
                      {formatNumber(sumNutrient(mealItems, 'calories'))} kcal
                    </Text>
                  </View>
                  <View
                    className="mx-4 overflow-hidden"
                    style={{ borderRadius: 26, borderCurve: 'continuous' }}
                  >
                    {mealItems.map((item, index) => (
                      <PlanRow
                        key={`${selectedDate}-${item.id}`}
                        item={item}
                        date={selectedDate}
                        editable={editable}
                        isFirst={index === 0}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </OverflowScrollView>
    </View>
  );
};

export default MealPlan;
