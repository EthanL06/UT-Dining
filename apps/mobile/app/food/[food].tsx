import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check, ChefHat, Flame, Heart, Info, X } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useEffect, useEffectEvent, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SheetManager, SheetProvider } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupedRow, GroupedSection } from '~/components/ui/Grouped';
import {
  ALLERGEN_ICONS,
  type AllergenKey,
  DAILY_VALUES,
  INDENTED_NUTRITION,
} from '~/data/AllergenInfo';
import { useDatabase } from '~/hooks/useDatabase';
import { useFoodData } from '~/hooks/useFoodData';
import { getSafePostHog } from '~/services/analytics/posthog';
import { isFavoriteItem } from '~/services/database/database';
import { useMealPlanStore } from '~/store/useMealPlanStore';
import { toggleFavoriteForFood, toggleMealPlanForFood } from '~/utils/foodActions';
import { type Theme, useTheme } from '~/utils/theme';
import { displayNutrient } from '~/utils/utils';

const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'total_carbohydrates', label: 'Carbs' },
  { key: 'total_fat', label: 'Fat' },
] as const;

const iconKey = (name: string) => name.toLowerCase().replaceAll(' ', '_') as AllergenKey;

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

const percentOfDailyValue = (key: string, value: unknown) => {
  const dailyValue = DAILY_VALUES[key];
  if (!dailyValue || value === null || value === undefined) return undefined;
  return `${Math.round((Number.parseFloat(String(value)) / dailyValue) * 100)}%`;
};

const FoodScreen = () => {
  const params = useLocalSearchParams<{
    food: string;
    menu: string;
    category: string;
    location: string;
    favorite: string;
    date: string;
  }>();
  const { food, menu, category, location, favorite, date } = params;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const [isFavorite, setIsFavorite] = useState(false);
  const isMealPlan = useMealPlanStore((state) => state.isMealPlanItem(food));

  const { foodItem, nutritionData, allergenList, dietaryList } = useFoodData(
    location,
    menu,
    category,
    food,
    favorite === 'true',
    date,
  );

  useEffect(() => {
    if (foodItem) setIsFavorite(isFavoriteItem(db, foodItem.name as string));
  }, [foodItem, db]);

  const analytics = getSafePostHog(usePostHog());
  const trackScreen = useEffectEvent(() => {
    analytics.screen(`${food}`, { location, menu, category });
  });
  useEffect(() => {
    trackScreen();
  }, []);

  const context = { location, menu, category };
  const nutritionRows = nutritionData.filter(
    (item) =>
      item.key !== 'Serving Size' &&
      item.key !== 'Calories' &&
      item.key !== 'Protein' &&
      item.key !== 'Total Carbohydrates',
  );
  const tags = [...allergenList, ...dietaryList];

  return (
    <SheetProvider context="food">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack.Screen options={{ title: 'Food' }} />
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <Pressable
              testID="back-button"
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className="size-11 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <X size={20} color={theme.label} />
            </Pressable>
            <Pressable
              testID="food-info-button"
              accessibilityLabel="About nutrition info"
              accessibilityRole="button"
              onPress={() => {
                SheetManager.show('food-info', { context: 'food' });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className="size-11 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.card }}
            >
              <Info size={20} color={theme.label} />
            </Pressable>
          </View>

          {foodItem && (
            <>
              <View className="px-5 pb-3">
                <Text
                  className="font-bold text-[28px] leading-[33px]"
                  style={{ color: theme.label }}
                >
                  {foodItem.name}
                </Text>
                <Text className="mt-0.5 text-[14.5px]" style={{ color: theme.secondaryLabel }}>
                  {[location, menu, category].filter(Boolean).join(' · ')}
                </Text>
              </View>

              <View className="mx-4 mb-2">
                <View
                  className="flex-row items-center justify-between px-4 py-3.5"
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 22,
                    borderCurve: 'continuous',
                  }}
                >
                  <View>
                    <Text className="text-[12.5px]" style={{ color: theme.secondaryLabel }}>
                      Calories · {displayNutrient(foodItem.nutrition?.serving_size)}
                    </Text>
                    <Text className="font-bold text-[34px]" style={{ color: theme.label }}>
                      {displayNutrient(foodItem.nutrition?.calories)}
                    </Text>
                  </View>
                  <Flame size={30} color={theme.tint} fill={theme.tint} />
                </View>
              </View>

              <View className="mx-4 mb-5 flex-row gap-x-2">
                {MACROS.map((macro) => (
                  <Tile
                    key={macro.key}
                    label={macro.label}
                    value={displayNutrient(foodItem.nutrition?.[macro.key])}
                    theme={theme}
                  />
                ))}
              </View>

              {tags.length > 0 && (
                <View className="mx-4 mb-5 flex-row flex-wrap gap-2">
                  {tags.map((tag) => (
                    <View
                      key={tag}
                      className="h-8 flex-row items-center gap-x-1.5 rounded-full pr-3 pl-1.5"
                      style={{ backgroundColor: theme.card }}
                    >
                      <Image
                        source={ALLERGEN_ICONS[iconKey(tag)]}
                        className="size-5 rounded-full"
                        resizeMode="contain"
                      />
                      <Text className="font-medium text-[13px]" style={{ color: theme.label }}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <GroupedSection header="Nutrition Facts">
                {nutritionRows.map((item, index) => {
                  const isKnown = item.value !== null && item.value !== undefined;
                  const indented = INDENTED_NUTRITION.has(item.key);
                  const percent = isKnown ? percentOfDailyValue(item.key, item.value) : undefined;
                  return (
                    <GroupedRow
                      key={item.key}
                      isFirst={index === 0}
                      title={
                        <Text
                          className="text-[16px]"
                          style={{
                            color: indented ? theme.secondaryLabel : theme.label,
                            paddingLeft: indented ? 14 : 0,
                          }}
                        >
                          {item.key}
                        </Text>
                      }
                      trailing={
                        <View className="flex-row items-center gap-x-3">
                          <Text className="text-[15px]" style={{ color: theme.secondaryLabel }}>
                            {displayNutrient(item.value)}
                          </Text>
                          <Text
                            className="w-10 text-right font-semibold text-[15px]"
                            style={{ color: theme.label }}
                          >
                            {percent ?? ''}
                          </Text>
                        </View>
                      }
                    />
                  );
                })}
              </GroupedSection>

              <GroupedSection header="Ingredients">
                <View className="px-4 py-3">
                  <Text className="text-[14.5px] leading-5" style={{ color: theme.secondaryLabel }}>
                    {foodItem.nutrition?.ingredients || 'Not listed'}
                  </Text>
                </View>
              </GroupedSection>
            </>
          )}
        </ScrollView>

        {foodItem && (
          <View
            className="absolute right-4 left-4 flex-row gap-x-2 rounded-full p-2"
            style={{
              bottom: insets.bottom + 8,
              backgroundColor: theme.card,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <Pressable
              testID="food-favorite-button"
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              accessibilityRole="button"
              onPress={async () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setIsFavorite(await toggleFavoriteForFood(db, foodItem, context));
              }}
              className="h-12 flex-1 flex-row items-center justify-center gap-x-2 rounded-full"
              style={{ backgroundColor: theme.fill }}
            >
              <Heart
                size={18}
                color={isFavorite ? theme.tint : theme.label}
                fill={isFavorite ? theme.tint : 'transparent'}
              />
              <Text className="font-semibold text-[15px]" style={{ color: theme.label }}>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Text>
            </Pressable>
            <Pressable
              testID="food-meal-plan-button"
              accessibilityLabel={isMealPlan ? 'Remove from meal plan' : 'Add to meal plan'}
              accessibilityRole="button"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                toggleMealPlanForFood(foodItem, context);
              }}
              className="h-12 flex-[1.4] flex-row items-center justify-center gap-x-2 rounded-full"
              style={{ backgroundColor: isMealPlan ? theme.tintSoft : theme.tint }}
            >
              {isMealPlan ? (
                <Check size={18} color={theme.tint} strokeWidth={3} />
              ) : (
                <ChefHat size={18} color="#FFFFFF" />
              )}
              <Text
                className="font-semibold text-[15px]"
                style={{ color: isMealPlan ? theme.tint : '#FFFFFF' }}
              >
                {isMealPlan ? 'In Meal Plan' : 'Add to Meal Plan'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SheetProvider>
  );
};

export default FoodScreen;
