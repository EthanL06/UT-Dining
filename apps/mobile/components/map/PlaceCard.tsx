import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { CircleAlert, MapPin, Navigation, Utensils, X } from 'lucide-react-native';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { GlassButton } from '~/components/ui/Glass';
import { StatusDot } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { directionsUrl } from '~/utils/directions';
import { log } from '~/utils/log';
import type { Coordinates, Place } from '~/utils/mapPlaces';
import { walkFrom, walkLabel } from '~/utils/mapPlaces';
import { useTheme } from '~/utils/theme';
import { PlaceIcon } from './placeStyle';
import { SheetScrollView } from './SheetScrollView';

const openDirections = (place: Place) => {
  const url = directionsUrl(
    { ...place.coordinates, address: place.address },
    Platform.OS === 'ios' ? 'ios' : 'android',
  );
  if (url) Linking.openURL(url).catch((error) => log.warn('Could not open directions', { error }));
};

export const SHEET_CONTENT_GAP = 16;
const STACKED_BUTTONS_FONT_SCALE = 1.3;

const Note = ({ text }: { text: string }) => {
  const theme = useTheme();
  return (
    <View
      className="mt-4 flex-row items-center gap-x-2 self-start rounded-2xl px-3.5 py-2.5"
      style={{ backgroundColor: theme.tintSoft }}
    >
      <CircleAlert size={16} color={theme.tint} />
      <Text variant="subheadline" tone="tint" className="shrink">
        {text}
      </Text>
    </View>
  );
};

export const PlaceCard = ({
  place,
  userCoordinates,
  foods,
  onClose,
}: {
  place: Place;
  userCoordinates: Coordinates | null;
  foods: string[];
  onClose: () => void;
}) => {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const stackButtons = fontScale >= STACKED_BUTTONS_FONT_SCALE;
  const buttonFlex = stackButtons ? null : { flex: 1 };
  const walk = walkFrom(userCoordinates, place);
  const typeLabel = place.type === 'microwave' ? 'Microwave' : place.type;
  const pinned = place.coordinates !== null;

  return (
    <View className="flex-1">
      <View className="px-4 pb-3">
        <View className="flex-row items-start gap-x-3">
          <PlaceIcon type={place.type} size={44} />
          <View className="flex-1">
            <Text variant="title2">{place.name}</Text>
            <Text variant="subheadline" tone="secondary">
              {[typeLabel, walk ? walkLabel(walk) : pinned ? null : 'No fixed spot']
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <GlassButton
            testID="map-place-close"
            accessibilityLabel="Close"
            size={32}
            hitSlop={8}
            fallbackColor={theme.fill}
            onPress={onClose}
          >
            <X size={16} color={theme.secondaryLabel} />
          </GlassButton>
        </View>
      </View>
      <SheetScrollView
        testID="map-place-scroll"
        containerStyle={{ flex: 1 }}
        contentContainerClassName="px-4 pt-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: SHEET_CONTENT_GAP }}
      >
        {place.type !== 'microwave' && (
          <View className="flex-row items-center gap-x-2">
            <StatusDot open={place.isOpen} />
            <Text variant="subheadline" color={place.isOpen ? theme.label : theme.secondaryLabel}>
              {place.status}
            </Text>
          </View>
        )}

        <View className={stackButtons ? 'mt-4 gap-y-2' : 'mt-4 flex-row gap-x-2'}>
          {pinned && (
            <Pressable
              testID="map-directions-button"
              accessibilityRole="button"
              onPress={() => openDirections(place)}
              className="min-h-12 flex-row items-center justify-center gap-x-2 rounded-full px-4 py-2.5"
              style={[buttonFlex, { backgroundColor: theme.tint }]}
            >
              <Navigation size={17} color="#FFFFFF" />
              <Text variant="callout" emphasized tone="onTint">
                Directions
              </Text>
            </Pressable>
          )}
          {place.type !== 'microwave' && (
            <Pressable
              testID="map-view-place-button"
              accessibilityRole="button"
              onPress={() => {
                const name = place.locationName ?? place.name;
                router.push({
                  pathname: place.hasMenu ? '/location/[location]' : '/location_generic/[location]',
                  params: { location: name },
                });
              }}
              className="min-h-12 flex-row items-center justify-center gap-x-2 rounded-full px-4 py-2.5"
              style={[buttonFlex, { backgroundColor: pinned ? theme.fill : theme.tint }]}
            >
              {place.hasMenu ? (
                <Utensils size={17} color={pinned ? theme.label : '#FFFFFF'} />
              ) : (
                <MapPin size={17} color={pinned ? theme.label : '#FFFFFF'} />
              )}
              <Text variant="callout" emphasized tone={pinned ? 'primary' : 'onTint'}>
                {place.hasMenu ? 'View Menu' : 'Details'}
              </Text>
            </Pressable>
          )}
        </View>

        {foods.length > 0 && <Note text={`On today’s menu: ${foods.join(', ')}`} />}
        {!pinned && <Note text="No fixed spot on the map. Check the details for where it parks." />}
        {place.note && <Note text={place.note} />}

        {place.description !== '' && (
          <Text variant="subheadline" paragraph tone="secondary" className="mt-4">
            {place.description}
          </Text>
        )}

        {pinned && (
          <Pressable
            accessibilityRole="button"
            onPress={() => openDirections(place)}
            className="mt-4 flex-row items-center gap-x-2"
          >
            <MapPin size={15} color={theme.secondaryLabel} />
            <Text variant="subheadline" tone="secondary" className="flex-1">
              {place.address}
            </Text>
          </Pressable>
        )}
      </SheetScrollView>
    </View>
  );
};
