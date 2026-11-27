import { Heart } from 'lucide-react-native';
import type React from 'react';
import { Pressable, View } from 'react-native';
import ActionSheet, { ScrollView, type SheetProps, useSheetRef } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MealPlanIcon } from '~/components/MealPlanIcon';
import { Image } from '~/components/ui/Image';
import { Text } from '~/components/ui/Text';

import { ALLERGEN_EXCEPTIONS, ALLERGEN_ICONS } from '~/data/AllergenInfo';
import { useFiltersStore } from '~/store/useFiltersStore';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

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
}) => {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isOn }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className="h-10 flex-row items-center gap-x-1.5 rounded-full pr-3.5 pl-1.5"
      style={{ backgroundColor: isOn ? theme.tint : theme.card }}
    >
      {icon}
      <Text variant="subheadline" emphasized tone={isOn ? 'onTint' : 'primary'}>
        {label}
      </Text>
    </Pressable>
  );
};

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <View className="mt-6 mb-2.5">
      <Text variant="title3">{title}</Text>
      {subtitle && (
        <Text variant="footnote" tone="secondary">
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const FiltersSheet = ({ sheetId }: SheetProps<'filters'>) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useSheetRef();
  const theme = useTheme();

  const {
    filters,
    toggleFavoriteFilter,
    toggleMealPlanFilter,
    toggleAllergenFilter,
    toggleDietaryFilter,
    resetFilters,
  } = useFiltersStore();

  const formatKey = (key: string) => {
    return key
      .split('_')
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const allergens = Object.entries(ALLERGEN_ICONS).filter(([key]) => !ALLERGEN_EXCEPTIONS.has(key));

  const dietaryOptions = Object.entries(ALLERGEN_ICONS).filter(([key]) =>
    ALLERGEN_EXCEPTIONS.has(key),
  );

  const activeCount =
    Number(filters.favorites) +
    Number(filters.mealPlan) +
    Object.values(filters.allergens).filter(Boolean).length +
    Object.values(filters.dietary).filter(Boolean).length;

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
            haptics.tap();
          }}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card, opacity: activeCount === 0 ? 0.5 : 1 }}
        >
          <Text variant="subheadline">Reset</Text>
        </Pressable>
        <Text variant="headline">Filters</Text>
        <Pressable
          testID="filters-done-button"
          accessibilityRole="button"
          onPress={() => sheetRef.current?.hide()}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card }}
        >
          <Text variant="subheadline" emphasized tone="tint">
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
                  <MealPlanIcon
                    size={16}
                    color={filters.mealPlan ? '#FFFFFF' : theme.tint}
                    filled={filters.mealPlan}
                  />
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
                  <Image source={iconSource} className="size-7 rounded-full" contentFit="contain" />
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
                  <Image source={iconSource} className="size-7 rounded-full" contentFit="contain" />
                }
              />
            ))}
          </View>

          <Text variant="caption" paragraph tone="secondary" className="mt-6">
            Allergen and dietary data comes from University Housing and Dining and may not always be
            accurate. Use discretion when making dietary choices.
          </Text>
        </View>
      </ScrollView>
    </ActionSheet>
  );
};

export default FiltersSheet;
