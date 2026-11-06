import * as Haptics from 'expo-haptics';
import { ChefHat, Heart } from 'lucide-react-native';
import type React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import ActionSheet, { ScrollView, SheetManager, type SheetProps } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ALLERGEN_EXCEPTIONS, ALLERGEN_ICONS } from '~/data/AllergenInfo';
import { useFiltersStore } from '~/store/useFiltersStore';
import { useTheme } from '~/utils/theme';

const FiltersSheet = ({ sheetId }: SheetProps<'filters'>) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Get filters from store
  const {
    filters,
    toggleFavoriteFilter,
    toggleMealPlanFilter,
    toggleAllergenFilter,
    toggleDietaryFilter,
    resetFilters,
  } = useFiltersStore();

  // Helper function to format allergen keys
  const formatKey = (key: string) => {
    return key
      .split('_')
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get allergens excluding dietary preferences
  const allergens = Object.entries(ALLERGEN_ICONS).filter(([key]) => !ALLERGEN_EXCEPTIONS.has(key));

  // Get dietary preferences
  const dietaryOptions = Object.entries(ALLERGEN_ICONS).filter(([key]) =>
    ALLERGEN_EXCEPTIONS.has(key),
  );

  const activeCount =
    Number(filters.favorites) +
    Number(filters.mealPlan) +
    Object.values(filters.allergens).filter(Boolean).length +
    Object.values(filters.dietary).filter(Boolean).length;

  const Chip = ({
    label,
    isOn,
    onPress,
    icon,
    testID,
  }: {
    label: string;
    isOn: boolean;
    onPress: () => void;
    icon: React.ReactNode;
    testID?: string;
  }) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isOn }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className="h-10 flex-row items-center gap-x-1.5 rounded-full pr-3.5 pl-1.5"
      style={{ backgroundColor: isOn ? theme.tint : theme.card }}
    >
      {icon}
      <Text
        className={isOn ? 'font-semibold text-[14px]' : 'font-medium text-[14px]'}
        style={{ color: isOn ? '#FFFFFF' : theme.label }}
      >
        {label}
      </Text>
    </Pressable>
  );

  const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <View className="mt-6 mb-2.5">
      <Text className="font-bold text-[18px]" style={{ color: theme.label }}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-[13.5px]" style={{ color: theme.secondaryLabel }}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <ActionSheet
      id={sheetId}
      defaultOverlayOpacity={0.3}
      containerStyle={{
        backgroundColor: theme.background,
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
      }}
      indicatorStyle={{ backgroundColor: theme.tertiaryLabel, width: 36 }}
      gestureEnabled
      safeAreaInsets={insets}
      useBottomSafeAreaPadding
    >
      <View className="flex-row items-center justify-between px-4 pt-1 pb-2">
        <Pressable
          testID="filters-reset-button"
          accessibilityRole="button"
          disabled={activeCount === 0}
          onPress={() => {
            resetFilters();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card, opacity: activeCount === 0 ? 0.5 : 1 }}
        >
          <Text className="font-medium text-[15px]" style={{ color: theme.label }}>
            Reset
          </Text>
        </Pressable>
        <Text className="font-semibold text-[17px]" style={{ color: theme.label }}>
          Filters
        </Text>
        <Pressable
          testID="filters-done-button"
          accessibilityRole="button"
          onPress={() => SheetManager.hide(sheetId)}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card }}
        >
          <Text className="font-semibold text-[15px]" style={{ color: theme.tint }}>
            Done
          </Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pb-6">
          <SectionTitle title="My items" />
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label="Favorites"
              isOn={filters.favorites}
              onPress={toggleFavoriteFilter}
              icon={
                <View className="size-7 items-center justify-center">
                  <Heart
                    size={16}
                    color={filters.favorites ? '#FFFFFF' : theme.tint}
                    fill={filters.favorites ? '#FFFFFF' : 'transparent'}
                  />
                </View>
              }
            />
            <Chip
              label="Meal Plan"
              isOn={filters.mealPlan}
              onPress={toggleMealPlanFilter}
              icon={
                <View className="size-7 items-center justify-center">
                  <ChefHat size={16} color={filters.mealPlan ? '#FFFFFF' : theme.tint} />
                </View>
              }
            />
          </View>

          <SectionTitle title="Hide foods with" subtitle="Allergens to avoid" />
          <View className="flex-row flex-wrap gap-2">
            {allergens.map(([key, iconSource]) => (
              <Chip
                key={key}
                testID={`filter-allergen-${key}`}
                label={formatKey(key)}
                isOn={!!filters.allergens[key]}
                onPress={() => toggleAllergenFilter(key)}
                icon={
                  <Image source={iconSource} className="size-7 rounded-full" resizeMode="contain" />
                }
              />
            ))}
          </View>

          <SectionTitle title="Only show" subtitle="Dietary preferences" />
          <View className="flex-row flex-wrap gap-2">
            {dietaryOptions.map(([key, iconSource]) => (
              <Chip
                key={key}
                testID={`filter-diet-${key}`}
                label={formatKey(key)}
                isOn={!!filters.dietary[key]}
                onPress={() => toggleDietaryFilter(key)}
                icon={
                  <Image source={iconSource} className="size-7 rounded-full" resizeMode="contain" />
                }
              />
            ))}
          </View>

          <Text
            className="mt-6 text-[12.5px] leading-[17px]"
            style={{ color: theme.secondaryLabel }}
          >
            Allergen and dietary data comes from University Housing and Dining and may not always be
            accurate. Use discretion when making dietary choices.
          </Text>
        </View>
      </ScrollView>
    </ActionSheet>
  );
};

export default FiltersSheet;
