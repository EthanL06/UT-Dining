import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '~/components/ui/Text';
import type { Place } from '~/utils/mapPlaces';
import { useTheme } from '~/utils/theme';
import { PlaceIcon } from './placeStyle';

export const placeDetail = (place: Place, walk: number | null) =>
  [
    place.type === 'microwave' ? place.description : place.status,
    walk ? `${walk} min walk` : place.coordinates ? null : 'No fixed spot',
  ]
    .filter(Boolean)
    .join(' · ');

export const SheetRow = ({
  title,
  detail,
  type,
  Icon,
  iconColor,
  isFirst,
  testID,
  onPress,
}: {
  title: string;
  detail: string;
  type: string;
  Icon?: LucideIcon;
  iconColor?: string;
  isFirst: boolean;
  testID?: string;
  onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View
          className="min-h-[58px] flex-row items-center gap-x-3 px-4 py-2.5"
          style={{ backgroundColor: pressed ? theme.fill : 'transparent' }}
        >
          {!isFirst && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                left: 64,
                height: 0.5,
                backgroundColor: theme.separator,
              }}
            />
          )}
          <PlaceIcon type={type} Icon={Icon} color={iconColor} />
          <View className="flex-1">
            <Text variant="callout" numberOfLines={1}>
              {title}
            </Text>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {detail}
            </Text>
          </View>
          <ChevronRight size={17} color={theme.tertiaryLabel} />
        </View>
      )}
    </Pressable>
  );
};

export const PlaceRow = ({
  place,
  walk,
  isFirst,
  detail,
  onPress,
}: {
  place: Place;
  walk: number | null;
  isFirst: boolean;
  detail?: string;
  onPress: () => void;
}) => (
  <SheetRow
    testID={`map-place-row-${place.name}`}
    title={place.name}
    detail={detail ?? placeDetail(place, walk)}
    type={place.type}
    isFirst={isFirst}
    onPress={onPress}
  />
);

export const RowGroup = ({ title, children }: { title?: string; children: React.ReactNode }) => {
  const theme = useTheme();
  return (
    <View className="gap-y-1.5">
      {title && (
        <Text variant="footnote" emphasized tone="secondary" className="mx-5 uppercase">
          {title}
        </Text>
      )}
      <View
        className="mx-3 overflow-hidden"
        style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
      >
        {children}
      </View>
    </View>
  );
};
