import { View } from 'react-native';
import { Text } from '~/components/ui/Text';
import type { Cluster, Place } from '~/utils/mapPlaces';
import { useTheme } from '~/utils/theme';
import { PLACE_ICONS, usePlaceColor } from './placeStyle';

const shortCloseTime = (status: string) =>
  status.match(/until (\d+)(?::(\d+))? (AM|PM)/)
    ? status.replace(/^Open until (\d+)(?::00)? (AM|PM)$/, '$1 $2').replace(/^Open until /, '')
    : '';

export const IconPin = ({ place, selected }: { place: Place; selected: boolean }) => {
  const Icon = PLACE_ICONS[place.type];
  const color = usePlaceColor(place.type);
  const size = selected ? 44 : 30;
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {Icon && <Icon size={size * 0.5} color="#FFFFFF" />}
    </View>
  );
};

export const ClosedDot = () => (
  <View
    className="size-3 rounded-full"
    style={{ backgroundColor: '#8E8E93', borderWidth: 2, borderColor: '#FFFFFF' }}
  />
);

export const LabelPin = ({ place }: { place: Place }) => {
  const theme = useTheme();
  const Icon = PLACE_ICONS[place.type];
  const color = usePlaceColor(place.type);
  const closes = shortCloseTime(place.status);
  return (
    <View
      className="h-9 flex-row items-center gap-x-1.5 rounded-full pr-3 pl-1"
      style={{
        backgroundColor: theme.card,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View
        className="size-[28px] items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        {Icon && <Icon size={15} color="#FFFFFF" />}
      </View>
      <Text variant="footnote" emphasized numberOfLines={1} className="max-w-40">
        {place.name}
      </Text>
      {closes !== '' && (
        <Text variant="footnote" tone="secondary">
          {closes}
        </Text>
      )}
    </View>
  );
};

export const ClusterPin = ({ cluster }: { cluster: Cluster }) => {
  const size = Math.min(42, 32 + cluster.places.length);
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: '#BF5700',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text variant="subheadline" emphasized tone="onTint">
        {cluster.places.length}
      </Text>
    </View>
  );
};
