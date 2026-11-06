import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { BicepsFlexed, ChevronLeft, ChevronRight, Flame, Wheat } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Notifier } from 'react-native-notifier';

import Alert from '~/components/Alert';
import { RemoveAction } from '~/components/AnimatedActions';
import { Container } from '~/components/Container';
import TopBar from '~/components/TopBar';
import { ALLERGEN_ICONS } from '~/data/AllergenInfo';
import {
  type MealPlanItem,
  planDayPhrase,
  sumNutrient,
  todayKey,
  useMealPlanDates,
  useMealPlanItems,
  useMealPlanStore,
} from '~/store/useMealPlanStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { COLORS } from '~/utils/colors';
import { createDateFromString, formatDateForDisplay } from '~/utils/date';
import { cn, displayNutrient } from '~/utils/utils';

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
  const day = createDateFromString(date);
  const label = formatDateForDisplay(day);
  if (['Today', 'Yesterday', 'Tomorrow'].includes(label)) return label;
  return day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const MealPlanComponent = ({
  food,
  selectedMenu,
  categoryName,
  location,
  quantity,
  date,
  editable,
}: {
  food: MealPlanItem;
  selectedMenu: string;
  categoryName: string;
  location: string;
  quantity: number;
  date: string;
  editable: boolean;
}) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const updateMealPlanItemQuantity = useMealPlanStore((state) => state.updateMealPlanItemQuantity);
  const removeMealPlanItem = useMealPlanStore((state) => state.removeMealPlanItem);

  // Local state to hold TextInput value.
  const [quantityInput, setQuantityInput] = useState(`${quantity}` || '1');

  const description = `${categoryName} - ${location} (${selectedMenu})`;
  const allergenData = Object.entries(food.allergens || {});
  const swipeableRef = useRef<SwipeableMethods>(null);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      containerStyle={{
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
        backgroundColor: COLORS['ut-burnt-orange'],
      }}
      enabled={editable}
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

        removeMealPlanItem(food.id, date);

        Notifier.showNotification({
          title: `${food.name} removed from ${planDayPhrase(date)}.`,
          description: 'You removed this item from your meal plan.',
          swipeEnabled: true,
          Component: Alert,
        });
      }}
    >
      <Pressable
        testID="meal-plan-item"
        disabled={!editable}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: '/food/[food]',
            params: {
              food: food.name,
              menu: selectedMenu,
              category: categoryName,
              location,
              favorite: 'false',
              date,
            },
          });
        }}
        className={cn(
          'flex-row items-center justify-between rounded border px-3 py-2 pb-2',
          isDarkMode ? 'border-neutral-800 bg-neutral-800' : 'border-ut-grey/15 bg-white',
        )}
      >
        <View className="max-w-[16rem] gap-1">
          <Text
            className={cn(
              'line-clamp-2 font-medium text-lg leading-6',
              isDarkMode ? 'text-white' : 'text-black',
            )}
          >
            {food.name}
          </Text>
          <Text
            className={cn('font-medium text-sm', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}
          >
            {description}
          </Text>
          <View className="flex flex-row gap-2">
            <View className="flex-row items-center gap-x-0.5">
              <Flame fill={COLORS['ut-burnt-orange']} size={10} color={COLORS['ut-burnt-orange']} />
              <Text
                className={cn('font-medium text-xs', isDarkMode ? 'text-gray-300' : 'text-black')}
              >
                {displayNutrient(food.nutrition?.calories)} kcal
              </Text>
            </View>
            <View className="flex-row items-center gap-x-0.5">
              <BicepsFlexed
                fill={COLORS['ut-burnt-orange']}
                size={10}
                color={COLORS['ut-burnt-orange']}
              />
              <Text
                className={cn('font-medium text-xs', isDarkMode ? 'text-gray-300' : 'text-black')}
              >
                {displayNutrient(food.nutrition?.protein)} Protein
              </Text>
            </View>
            <View className="flex-row items-center gap-x-0.5">
              <Wheat fill={COLORS['ut-burnt-orange']} size={10} color={COLORS['ut-burnt-orange']} />
              <Text
                className={cn('font-medium text-xs', isDarkMode ? 'text-gray-300' : 'text-black')}
              >
                {displayNutrient(food.nutrition?.total_carbohydrates)} Carbs
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-1">
            {allergenData.map(
              ([key, value]) =>
                value && (
                  <Image
                    key={key}
                    source={ALLERGEN_ICONS[key as keyof typeof ALLERGEN_ICONS]}
                    className="size-3 rounded-full"
                    resizeMode="contain"
                  />
                ),
            )}
          </View>
        </View>

        <View className="relative items-center gap-1">
          {editable ? (
            <TextInput
              className="h-8 w-12 rounded-lg border border-ut-burnt-orange text-center font-bold text-ut-burnt-orange"
              keyboardType="decimal-pad"
              value={quantityInput}
              onChangeText={setQuantityInput}
              onEndEditing={() => {
                let quantity = parseFloat(quantityInput);
                if (Number.isNaN(quantity)) {
                  quantity = 1;
                }
                if (quantity <= 0) {
                  removeMealPlanItem(food.id, date);

                  Notifier.showNotification({
                    title: `${food.name} removed from ${planDayPhrase(date)}.`,
                    description: 'You removed this item from your meal plan.',
                    swipeEnabled: true,
                    Component: Alert,
                  });
                } else if (quantity > 99) {
                  quantity = 99;
                }

                quantity = Math.round(quantity * 100) / 100;
                setQuantityInput(quantity.toString());
                updateMealPlanItemQuantity(food.id, quantity, date);
              }}
            />
          ) : (
            <Text className="h-8 w-12 text-center font-bold text-ut-burnt-orange leading-8">
              {quantity}
            </Text>
          )}
          <Text
            className={cn('font-medium text-xs', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}
          >
            Quantity
          </Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
};

const MealPlan = () => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const today = useToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [lastToday, setLastToday] = useState(today);
  if (lastToday !== today) {
    setLastToday(today);
    if (selectedDate === lastToday) setSelectedDate(today);
  }

  const mealPlanItems = useMealPlanItems(selectedDate);
  const planDates = useMealPlanDates();
  const days = useMemo(
    () => Array.from(new Set([...planDates, today, selectedDate])).sort(),
    [planDates, today, selectedDate],
  );
  const dayIndex = days.indexOf(selectedDate);
  const previousDay = dayIndex > 0 ? days[dayIndex - 1] : null;
  const nextDay = dayIndex < days.length - 1 ? days[dayIndex + 1] : null;
  const editable = selectedDate >= today;

  const totalCalories = sumNutrient(mealPlanItems, 'calories');
  const totalProtein = sumNutrient(mealPlanItems, 'protein');
  const totalCarbs = sumNutrient(mealPlanItems, 'total_carbohydrates');

  const goTo = (date: string | null) => {
    if (!date) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
  };

  const arrowColor = (enabled: boolean) => {
    if (enabled) return COLORS['ut-burnt-orange'];
    return isDarkMode ? COLORS['ut-grey-dark-mode'] : COLORS['ut-grey'];
  };

  return (
    <Container className="m-0">
      <FlatList
        keyExtractor={(item) => `${selectedDate}-${item.id}`}
        ListHeaderComponent={
          <View className={cn('flex gap-y-5 py-6', isDarkMode ? 'bg-neutral-900' : 'bg-white')}>
            <TopBar variant="back" />
            <View>
              <View className="flex-row items-center gap-x-2">
                <Text
                  className={cn(
                    'font-extrabold text-3xl',
                    isDarkMode ? 'text-white' : 'text-black',
                  )}
                >
                  Your Meal Plan
                </Text>
              </View>
              <Text className={cn('font-medium', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}>
                Swipe right on a food item to add it to that day's meal plan. Each day gets its own
                plan, and past days stay here so you can look back on what you ate.
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                testID="meal-plan-previous-day"
                accessibilityLabel="Previous day"
                disabled={!previousDay}
                onPress={() => goTo(previousDay)}
                hitSlop={12}
              >
                <ChevronLeft size={24} color={arrowColor(!!previousDay)} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="meal-plan-day"
                disabled={selectedDate === today}
                onPress={() => goTo(today)}
                className="items-center"
              >
                <Text className={cn('font-bold text-lg', isDarkMode ? 'text-white' : 'text-black')}>
                  {formatPlanDay(selectedDate)}
                </Text>
                {selectedDate !== today && (
                  <Text className="font-medium text-ut-burnt-orange text-xs">Back to today</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                testID="meal-plan-next-day"
                accessibilityLabel="Next day"
                disabled={!nextDay}
                onPress={() => goTo(nextDay)}
                hitSlop={12}
              >
                <ChevronRight size={24} color={arrowColor(!!nextDay)} />
              </TouchableOpacity>
            </View>

            <View
              className={cn(
                'flex-row justify-around rounded-lg border p-4',
                isDarkMode ? 'border-neutral-800 bg-neutral-800' : 'border-ut-grey/15 bg-white',
              )}
            >
              <View className="flex-1 items-center">
                <Text className="text-center font-bold text-lg text-ut-burnt-orange">
                  {totalCalories.toFixed(1)} kcal
                </Text>
                <Text
                  className={cn(
                    'font-medium text-xs',
                    isDarkMode ? 'text-gray-300' : 'text-ut-grey',
                  )}
                >
                  Calories
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-center font-bold text-lg text-ut-burnt-orange">
                  {totalProtein.toFixed(1)}g
                </Text>
                <Text
                  className={cn(
                    'font-medium text-xs',
                    isDarkMode ? 'text-gray-300' : 'text-ut-grey',
                  )}
                >
                  Protein
                </Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-center font-bold text-lg text-ut-burnt-orange">
                  {totalCarbs.toFixed(1)}g
                </Text>
                <Text
                  className={cn(
                    'font-medium text-xs',
                    isDarkMode ? 'text-gray-300' : 'text-ut-grey',
                  )}
                >
                  Carbs
                </Text>
              </View>
            </View>

            <View
              className={cn(
                'my-1 w-full border-b',
                isDarkMode ? 'border-neutral-800' : 'border-b-ut-grey/15',
              )}
            />
          </View>
        }
        data={mealPlanItems}
        contentContainerClassName="px-6"
        renderItem={({ item }) => (
          <MealPlanComponent
            categoryName={item.categoryName}
            food={item}
            location={item.locationName}
            selectedMenu={item.menuName}
            quantity={item.quantity || 1}
            date={selectedDate}
            editable={editable}
          />
        )}
        ListEmptyComponent={
          <View className="mt-12 flex items-center justify-center">
            <Text
              className={cn(
                'font-bold text-lg',
                isDarkMode ? 'text-white' : 'text-ut-burnt-orange',
              )}
            >
              {editable ? 'Empty Meal Plan!' : 'Nothing logged'}
            </Text>
            <Text
              className={cn('max-w-64 text-center', isDarkMode ? 'text-gray-300' : 'text-ut-grey')}
            >
              {editable
                ? 'Swipe right on a food item to add to your meal plan.'
                : 'You had nothing in your meal plan this day.'}
            </Text>
          </View>
        }
        stickyHeaderIndices={[0]} // Makes the header sticky
      />
    </Container>
  );
};

export default MealPlan;
