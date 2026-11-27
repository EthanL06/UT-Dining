import { Heart } from 'lucide-react-native';
import type React from 'react';
import { memo } from 'react';
import { View } from 'react-native';
import ActionSheet, { ScrollView, type SheetProps, useSheetRef } from 'react-native-actions-sheet';
import Reanimated, { useReducedMotion, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MealPlanIcon } from '~/components/MealPlanIcon';
import { RollingNumber } from '~/components/motion/RollingNumber';
import { Image } from '~/components/ui/Image';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { PressableScale } from '~/components/ui/PressableScale';
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
    <PressableScale
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
    </PressableScale>
  );
};

const formatKey = (key: string) =>
  key
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const allergens = Object.entries(ALLERGEN_ICONS).filter(([key]) => !ALLERGEN_EXCEPTIONS.has(key));

const dietaryOptions = Object.entries(ALLERGEN_ICONS).filter(([key]) =>
  ALLERGEN_EXCEPTIONS.has(key),
);

const IconChip = memo(
  ({
    id,
    testID,
    iconSource,
    isOn,
    onToggle,
  }: {
    id: string;
    testID: string;
    iconSource: number;
    isOn: boolean;
    onToggle: (id: string) => void;
  }) => (
    <Chip
      testID={testID}
      label={formatKey(id)}
      isOn={isOn}
      onPress={() => onToggle(id)}
      icon={<Image source={iconSource} className="size-7 rounded-full" contentFit="contain" />}
    />
  ),
);

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
  const reduceMotion = useReducedMotion();

  const filters = useFiltersStore((state) => state.filters);
  const toggleFavoriteFilter = useFiltersStore((state) => state.toggleFavoriteFilter);
  const toggleMealPlanFilter = useFiltersStore((state) => state.toggleMealPlanFilter);
  const toggleAllergenFilter = useFiltersStore((state) => state.toggleAllergenFilter);
  const toggleDietaryFilter = useFiltersStore((state) => state.toggleDietaryFilter);
  const resetFilters = useFiltersStore((state) => state.resetFilters);

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
        <PressableScale
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
        </PressableScale>
        <View className="flex-row items-center gap-x-1.5">
          <Text variant="headline">Filters</Text>
          {activeCount > 0 && (
            <Reanimated.View
              entering={reduceMotion ? undefined : ZoomIn.springify().damping(14)}
              exiting={reduceMotion ? undefined : ZoomOut.duration(140)}
              testID="filters-active-count"
              style={{
                height: 22,
                minWidth: 22,
                paddingHorizontal: 6,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.tint,
              }}
            >
              <RollingNumber value={activeCount} variant="footnote" emphasized tone="onTint" />
            </Reanimated.View>
          )}
        </View>
        <PressableScale
          testID="filters-done-button"
          accessibilityRole="button"
          onPress={() => sheetRef.current?.hide()}
          className="h-9 justify-center rounded-full px-3.5"
          style={{ backgroundColor: theme.card }}
        >
          <Text variant="subheadline" emphasized tone="tint">
            Done
          </Text>
        </PressableScale>
      </View>
      <OverflowScrollView as={ScrollView} showsVerticalScrollIndicator={false}>
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
              <IconChip
                key={key}
                id={key}
                testID={`filter-allergen-${key}`}
                iconSource={iconSource}
                isOn={!!filters.allergens[key]}
                onToggle={toggleAllergenFilter}
              />
            ))}
          </View>

          <SectionTitle title="Only show" subtitle="Dietary preferences" />
          <View className="flex-row flex-wrap gap-2">
            {dietaryOptions.map(([key, iconSource]) => (
              <IconChip
                key={key}
                id={key}
                testID={`filter-diet-${key}`}
                iconSource={iconSource}
                isOn={!!filters.dietary[key]}
                onToggle={toggleDietaryFilter}
              />
            ))}
          </View>

          <Text variant="caption" paragraph tone="secondary" className="mt-6">
            Allergen and dietary data comes from University Housing and Dining and may not always be
            accurate. Use discretion when making dietary choices.
          </Text>
        </View>
      </OverflowScrollView>
    </ActionSheet>
  );
};

export default FiltersSheet;
