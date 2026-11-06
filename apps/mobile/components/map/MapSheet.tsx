import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  ChevronRight,
  CircleAlert,
  Coffee,
  type LucideIcon,
  MapPin,
  Microwave,
  Navigation,
  Search,
  Soup,
  Store,
  Truck,
  Utensils,
  X,
} from 'lucide-react-native';
import { type ReactNode, useEffect } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { StatusDot } from '~/components/ui/Grouped';
import { useSettingsStore } from '~/store/useSettingsStore';
import type { Coordinates, Place } from '~/utils/mapPlaces';
import { walkingMinutes } from '~/utils/mapPlaces';
import { useTheme } from '~/utils/theme';

export const PLACE_ICONS: Record<string, LucideIcon> = {
  microwave: Microwave,
  'Coffee Shop': Coffee,
  'Convenience Store': Store,
  'Dining Hall': Utensils,
  'Food & Drink': Soup,
  'Food Truck': Truck,
};

export const PLACE_COLORS: Record<string, { default: string; colorBlind: string }> = {
  microwave: { default: '#C0392B', colorBlind: '#556B2F' },
  'Coffee Shop': { default: '#5C3A21', colorBlind: '#D2691E' },
  'Convenience Store': { default: '#36827F', colorBlind: '#004D60' },
  'Dining Hall': { default: '#BF5700', colorBlind: '#5A2200' },
  'Food & Drink': { default: '#D97706', colorBlind: '#C2185B' },
  'Food Truck': { default: '#43A047', colorBlind: '#7B1FA2' },
};

export const usePlaceColor = (type: string) => {
  const isColorBlindMode = useSettingsStore((state) => state.isColorBlindMode);
  const colors = PLACE_COLORS[type] ?? { default: '#8E8E93', colorBlind: '#8E8E93' };
  return isColorBlindMode ? colors.colorBlind : colors.default;
};

export const MAP_FILTERS = [
  { id: 'open', label: 'Open now' },
  { id: 'Dining Hall', label: 'Dining Halls' },
  { id: 'Food & Drink', label: 'Food & Drink' },
  { id: 'Food Truck', label: 'Food Trucks' },
  { id: 'Coffee Shop', label: 'Coffee' },
  { id: 'Convenience Store', label: 'Convenience' },
  { id: 'microwave', label: 'Microwaves' },
] as const;

export type MapFilterId = (typeof MAP_FILTERS)[number]['id'];

const PlaceIcon = ({ type, size = 36 }: { type: string; size?: number }) => {
  const Icon = PLACE_ICONS[type] ?? MapPin;
  const color = usePlaceColor(type);
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: color }}
    >
      <Icon size={size * 0.52} color="#FFFFFF" />
    </View>
  );
};

const openDirections = (place: Place) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const address = encodeURIComponent(place.address.replace(/\s/g, '+'));
  Linking.openURL(
    Platform.OS === 'ios'
      ? `maps://maps.apple.com/?daddr=${address}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${address}&travelmode=walking`,
  );
};

const PlaceCard = ({
  place,
  userCoordinates,
  onClose,
}: {
  place: Place;
  userCoordinates: Coordinates | null;
  onClose: () => void;
}) => {
  const theme = useTheme();
  const walk = userCoordinates ? walkingMinutes(userCoordinates, place.coordinates) : null;
  const typeLabel = place.type === 'microwave' ? 'Microwave' : place.type;

  return (
    <ScrollView contentContainerClassName="px-4 pb-6">
      <View className="flex-row items-start gap-x-3">
        <PlaceIcon type={place.type} size={44} />
        <View className="flex-1">
          <Text className="font-bold text-[22px] leading-[27px]" style={{ color: theme.label }}>
            {place.name}
          </Text>
          <Text className="text-[14px]" style={{ color: theme.secondaryLabel }}>
            {[typeLabel, walk ? `${walk} min walk` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable
          testID="map-place-close"
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          className="size-8 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.fill }}
        >
          <X size={16} color={theme.secondaryLabel} />
        </Pressable>
      </View>

      {place.type !== 'microwave' && (
        <View className="mt-3 flex-row items-center gap-x-2">
          <StatusDot open={place.isOpen} />
          <Text
            className="font-medium text-[15px]"
            style={{ color: place.isOpen ? theme.label : theme.secondaryLabel }}
          >
            {place.status}
          </Text>
        </View>
      )}

      <View className="mt-4 flex-row gap-x-2">
        <Pressable
          testID="map-directions-button"
          accessibilityRole="button"
          onPress={() => openDirections(place)}
          className="h-12 flex-1 flex-row items-center justify-center gap-x-2 rounded-full"
          style={{ backgroundColor: theme.tint }}
        >
          <Navigation size={17} color="#FFFFFF" />
          <Text className="font-semibold text-[16px] text-white">Directions</Text>
        </Pressable>
        {place.type !== 'microwave' && (
          <Pressable
            testID="map-view-place-button"
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(
                place.hasMenu ? `/location/${place.name}` : `/location_generic/${place.name}`,
              );
            }}
            className="h-12 flex-1 flex-row items-center justify-center gap-x-2 rounded-full"
            style={{ backgroundColor: theme.fill }}
          >
            {place.hasMenu ? (
              <Utensils size={17} color={theme.label} />
            ) : (
              <MapPin size={17} color={theme.label} />
            )}
            <Text className="font-semibold text-[16px]" style={{ color: theme.label }}>
              {place.hasMenu ? 'View Menu' : 'Details'}
            </Text>
          </Pressable>
        )}
      </View>

      {place.note && (
        <View
          className="mt-4 flex-row items-center gap-x-2 self-start rounded-2xl px-3.5 py-2.5"
          style={{ backgroundColor: theme.tintSoft }}
        >
          <CircleAlert size={16} color={theme.tint} />
          <Text className="font-medium text-[14px]" style={{ color: theme.tint }}>
            {place.note}
          </Text>
        </View>
      )}

      {place.description !== '' && (
        <Text className="mt-4 text-[15px] leading-5" style={{ color: theme.secondaryLabel }}>
          {place.description}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => openDirections(place)}
        className="mt-4 flex-row items-center gap-x-2"
      >
        <MapPin size={15} color={theme.secondaryLabel} />
        <Text className="flex-1 text-[14px]" style={{ color: theme.secondaryLabel }}>
          {place.address}
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const PlaceRow = ({
  place,
  walk,
  isFirst,
  onPress,
}: {
  place: Place;
  walk: number | null;
  isFirst: boolean;
  onPress: () => void;
}) => {
  const theme = useTheme();
  const detail = place.type === 'microwave' ? place.description : place.status;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${detail}${walk ? `, ${walk} minute walk` : ''}`}
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
          <PlaceIcon type={place.type} />
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[16px]" style={{ color: theme.label }}>
              {place.name}
            </Text>
            <Text
              numberOfLines={1}
              className="text-[13.5px]"
              style={{ color: theme.secondaryLabel }}
            >
              {[detail, walk ? `${walk} min walk` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <ChevronRight size={17} color={theme.tertiaryLabel} />
        </View>
      )}
    </Pressable>
  );
};

type Detent = 'collapsed' | 'half' | 'full';

const SPRING = { damping: 22, stiffness: 220, mass: 0.6 };

export const MapSheet = ({
  places,
  query,
  onQueryChange,
  filters,
  onToggleFilter,
  selectedPlace,
  onSelectPlace,
  onClosePlace,
  userCoordinates,
  bottomOffset,
  onHeightChange,
}: {
  places: Place[];
  query: string;
  onQueryChange: (query: string) => void;
  filters: Set<MapFilterId>;
  onToggleFilter: (id: MapFilterId) => void;
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  onClosePlace: () => void;
  userCoordinates: Coordinates | null;
  bottomOffset: number;
  onHeightChange: (height: number) => void;
}) => {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const heights: Record<Detent, number> = {
    collapsed: 178,
    half: Math.round(windowHeight * 0.42),
    full: Math.round(windowHeight * 0.78),
  };
  const height = useSharedValue(heights.half);
  const dragStart = useSharedValue(0);

  const snapTo = (detent: Detent) => {
    height.value = withSpring(heights[detent], SPRING);
    onHeightChange(heights[detent]);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: report the starting height once
  useEffect(() => {
    onHeightChange(heights.half);
  }, []);

  useEffect(() => {
    if (selectedPlace) {
      height.value = withSpring(heights.half, SPRING);
      onHeightChange(heights.half);
    }
  }, [selectedPlace, height, heights.half, onHeightChange]);

  const settle = (velocity: number) => {
    const current = height.value - velocity * 0.12;
    const nearest = (Object.keys(heights) as Detent[]).reduce((best, detent) =>
      Math.abs(heights[detent] - current) < Math.abs(heights[best] - current) ? detent : best,
    );
    Haptics.selectionAsync();
    snapTo(nearest);
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = height.value;
    })
    .onUpdate((event) => {
      height.value = Math.min(
        heights.full + 20,
        Math.max(heights.collapsed - 20, dragStart.value - event.translationY),
      );
    })
    .onEnd((event) => {
      runOnJS(settle)(-event.velocityY);
    });

  const style = useAnimatedStyle(() => ({ height: height.value }));

  const visible = places
    .map((place) => ({
      place,
      walk: userCoordinates ? walkingMinutes(userCoordinates, place.coordinates) : null,
    }))
    .sort((a, b) => {
      const rank = (place: Place) => (place.type === 'microwave' ? 2 : place.isOpen ? 0 : 1);
      if (rank(a.place) !== rank(b.place)) return rank(a.place) - rank(b.place);
      if (a.walk !== null && b.walk !== null) return a.walk - b.walk;
      return 0;
    });

  let content: ReactNode;
  if (selectedPlace) {
    content = (
      <PlaceCard place={selectedPlace} userCoordinates={userCoordinates} onClose={onClosePlace} />
    );
  } else {
    content = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-6">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-x-2 px-4 pb-3"
        >
          {MAP_FILTERS.map((filter) => {
            const isOn = filters.has(filter.id);
            return (
              <Pressable
                key={filter.id}
                testID={`map-filter-${filter.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isOn }}
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggleFilter(filter.id);
                }}
                className="h-[34px] justify-center rounded-full px-3.5"
                style={{ backgroundColor: isOn ? theme.tint : theme.fill }}
              >
                <Text
                  className={isOn ? 'font-semibold text-[14px]' : 'font-medium text-[14px]'}
                  style={{ color: isOn ? '#FFFFFF' : theme.label }}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {visible.length === 0 ? (
          <Text className="mx-5 mt-2 text-[15px]" style={{ color: theme.secondaryLabel }}>
            No places match. Try turning off a filter.
          </Text>
        ) : (
          <View
            className="mx-3 overflow-hidden"
            style={{ backgroundColor: theme.card, borderRadius: 22, borderCurve: 'continuous' }}
          >
            {visible.map(({ place, walk }, index) => (
              <PlaceRow
                key={place.name}
                place={place}
                walk={walk}
                isFirst={index === 0}
                onPress={() => onSelectPlace(place)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <Reanimated.View
      style={[
        style,
        {
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: bottomOffset,
          borderRadius: 34,
          borderCurve: 'continuous',
          backgroundColor: theme.background,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -2 },
          overflow: 'hidden',
        },
      ]}
    >
      <GestureDetector gesture={pan}>
        <View className="pt-2 pb-3">
          <View
            className="mb-2.5 h-[5px] w-9 self-center rounded-full"
            style={{ backgroundColor: theme.tertiaryLabel }}
          />
          {!selectedPlace && (
            <View
              className="mx-4 h-10 flex-row items-center gap-x-2 rounded-full px-3"
              style={{ backgroundColor: theme.fill }}
            >
              <Search size={17} color={theme.secondaryLabel} />
              <TextInput
                testID="map-search-input"
                className="flex-1 text-[16px]"
                style={{ color: theme.label }}
                placeholder="Search campus dining"
                placeholderTextColor={theme.secondaryLabel}
                value={query}
                onChangeText={onQueryChange}
                onFocus={() => snapTo('full')}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityLabel="Clear search"
                  hitSlop={8}
                  onPress={() => onQueryChange('')}
                >
                  <X size={16} color={theme.secondaryLabel} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </GestureDetector>
      <View style={{ flex: 1 }}>{content}</View>
    </Reanimated.View>
  );
};
