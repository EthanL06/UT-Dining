import { View } from 'react-native';
import ActionSheet, { ScrollView, type SheetProps, useSheetRef } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from '~/components/ui/Image';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import { ALLERGEN_EXCEPTIONS, ALLERGEN_ICONS } from '~/data/AllergenInfo';
import { useTheme } from '~/utils/theme';

const displayName = (key: string) =>
  key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const entries = Object.entries(ALLERGEN_ICONS);
const ALLERGENS = entries.filter(([key]) => !ALLERGEN_EXCEPTIONS.has(key));
const DIETARY = entries.filter(([key]) => ALLERGEN_EXCEPTIONS.has(key));

const Section = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: typeof entries;
}) => {
  const theme = useTheme();
  return (
    <View className="mt-4">
      <Text variant="title3">{title}</Text>
      <Text variant="footnote" tone="secondary" className="mb-2.5">
        {subtitle}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map(([key, icon]) => (
          <View
            key={key}
            className="h-10 flex-row items-center gap-x-1.5 rounded-full pr-3.5 pl-1.5"
            style={{ backgroundColor: theme.card }}
          >
            <Image source={icon} className="size-7 rounded-full" contentFit="contain" />
            <Text variant="subheadline">{displayName(key)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const FoodInfoSheet = ({ sheetId }: SheetProps<'food-info'>) => {
  const insets = useSafeAreaInsets();
  const sheetRef = useSheetRef();
  const theme = useTheme();

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
        <View className="w-[68px]" />
        <Text variant="headline">Food Legend</Text>
        <PressableScale
          testID="food-info-done-button"
          accessibilityRole="button"
          onPress={() => sheetRef.current?.hide()}
          className="h-9 w-[68px] items-center justify-center rounded-full"
          style={{ backgroundColor: theme.card }}
        >
          <Text variant="subheadline" emphasized tone="tint">
            Done
          </Text>
        </PressableScale>
      </View>
      <OverflowScrollView
        as={ScrollView}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 560 }}
      >
        <View className="px-4 pb-6">
          <Section
            title="Allergens"
            subtitle="Foods that contain these allergens show this icon."
            items={ALLERGENS}
          />
          <Section
            title="Dietary preferences"
            subtitle="Foods that meet these preferences show this icon."
            items={DIETARY}
          />
          <Text variant="caption" paragraph tone="secondary" className="mt-6">
            Allergen and dietary data comes from University Housing and Dining and may not always be
            accurate. Use discretion when making dietary choices.
          </Text>
        </View>
      </OverflowScrollView>
    </ActionSheet>
  );
};

export default FoodInfoSheet;
