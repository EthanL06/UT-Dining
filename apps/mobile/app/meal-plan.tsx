import { formatCentralDateKey } from '@ut-dining/core';
import { Stack } from 'expo-router';
import { ChefHat, ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Alert as NativeAlert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatGrams, formatNumber } from '~/components/mealPlan/format';
import { PlanRow } from '~/components/mealPlan/PlanRow';
import { UndoToast } from '~/components/mealPlan/UndoToast';
import { largeTitleHeaderOptions } from '~/components/TabStack';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
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

type ViewedDay = { kind: 'today' } | { kind: 'date'; date: string };

type Undo =
  | { status: 'idle' }
  | { status: 'removed'; item: MealPlanItem; index: number; date: string };

const UNDO_MS = 4000;

const MealPlan = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const [viewing, setViewing] = useState<ViewedDay>({ kind: 'today' });
  const selectedDate = viewing.kind === 'today' ? today : viewing.date;

  const items = useMealPlanItems(selectedDate);
  const planDates = useMealPlanDates();
  const clearMealPlan = useMealPlanStore((state) => state.clearMealPlan);
  const removeItem = useMealPlanStore((state) => state.removeMealPlanItem);
  const restoreItem = useMealPlanStore((state) => state.restoreMealPlanItem);
  const [undo, setUndo] = useState<Undo>({ status: 'idle' });

  useEffect(() => {
    if (undo.status !== 'removed') return;
    const timer = setTimeout(() => setUndo({ status: 'idle' }), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const removeFromPlan = (item: MealPlanItem) => {
    const index = items.findIndex((existing) => existing.id === item.id);
    removeItem(item.id, selectedDate);
    haptics.remove();
    setUndo({ status: 'removed', item, index: Math.max(index, 0), date: selectedDate });
  };

  const undoRemove = () => {
    if (undo.status !== 'removed') return;
    restoreItem(undo.item, undo.index, undo.date);
    haptics.success();
    setUndo({ status: 'idle' });
  };
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Meal Plan',
          ...largeTitleHeaderOptions(theme),
          headerRight:
            editable && items.length > 0
              ? () => (
                  <Pressable
                    testID="meal-plan-reset-button"
                    accessibilityRole="button"
                    onPress={confirmReset}
                    hitSlop={8}
                    className="px-1.5"
                  >
                    <Text variant="callout" emphasized tone="tint">
                      Reset
                    </Text>
                  </Pressable>
                )
              : undefined,
        }}
      />
      <OverflowScrollView
        testID="meal-plan-screen"
        divider={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text variant="subheadline" paragraph tone="secondary" className="px-5 pt-1 pb-4">
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
                ? 'Press and hold a food on any menu to add it here.'
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
                        onRemove={removeFromPlan}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </OverflowScrollView>
      {undo.status === 'removed' && (
        <UndoToast
          key={`${undo.date}-${undo.item.id}`}
          message={`Removed ${undo.item.name}`}
          bottom={insets.bottom + 16}
          onUndo={undoRemove}
        />
      )}
    </View>
  );
};

export default MealPlan;
