import { Pressable, ScrollView, View } from 'react-native';
import { OverflowScrollView } from '~/components/ui/OverflowScrollView';
import { Text } from '~/components/ui/Text';
import { haptics } from '~/utils/haptics';
import { type Coordinates, type Place, walkFrom } from '~/utils/mapPlaces';
import { browseView } from '~/utils/mapSheetView';
import { useTheme } from '~/utils/theme';
import { PlaceRow, RowGroup } from './PlaceRow';
import { MAP_FILTERS, type MapFilterId } from './placeStyle';
import { SkeletonRows } from './SkeletonRows';

const rank = (place: Place) => (place.type === 'microwave' ? 2 : place.isOpen ? 0 : 1);

export const BrowseList = ({
  places,
  isLoaded,
  filters,
  userCoordinates,
  bottomOffset,
  onToggleFilter,
  onClearFilters,
  onSelectPlace,
}: {
  places: Place[];
  isLoaded: boolean;
  filters: Set<MapFilterId>;
  userCoordinates: Coordinates | null;
  bottomOffset: number;
  onToggleFilter: (id: MapFilterId) => void;
  onClearFilters: () => void;
  onSelectPlace: (place: Place) => void;
}) => {
  const theme = useTheme();
  const visible = places
    .map((place) => ({ place, walk: walkFrom(userCoordinates, place) }))
    .sort((a, b) => {
      if (rank(a.place) !== rank(b.place)) return rank(a.place) - rank(b.place);
      if (a.walk !== null && b.walk !== null) return a.walk - b.walk;
      if (a.walk !== b.walk) return a.walk === null ? 1 : -1;
      return 0;
    });
  const view = browseView(isLoaded, visible.length);

  return (
    <OverflowScrollView
      containerStyle={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: bottomOffset + 24 }}
    >
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
                haptics.selection();
                onToggleFilter(filter.id);
              }}
              className="h-[34px] justify-center rounded-full px-3.5"
              style={{ backgroundColor: isOn ? theme.tint : theme.fill }}
            >
              <Text variant="subheadline" emphasized tone={isOn ? 'onTint' : 'primary'}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {view.kind === 'loading' ? (
        <SkeletonRows testID="map-browse-loading" />
      ) : view.kind === 'empty' ? (
        <View testID="map-browse-empty" className="mx-8 mt-4 items-center gap-y-2">
          <Text variant="headline" className="text-center">
            {filters.has('open') ? 'Nothing open matches these filters' : 'No places match'}
          </Text>
          <Pressable
            testID="map-filters-clear"
            accessibilityRole="button"
            onPress={onClearFilters}
            className="mt-1 h-9 justify-center rounded-full px-4"
            style={{ backgroundColor: theme.fill }}
          >
            <Text variant="subheadline" emphasized>
              Clear filters
            </Text>
          </Pressable>
        </View>
      ) : (
        <RowGroup>
          {visible.map(({ place, walk }, index) => (
            <PlaceRow
              key={place.name}
              place={place}
              walk={walk}
              isFirst={index === 0}
              onPress={() => onSelectPlace(place)}
            />
          ))}
        </RowGroup>
      )}
    </OverflowScrollView>
  );
};
