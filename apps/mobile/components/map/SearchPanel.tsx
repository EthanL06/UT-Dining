import { Building2, Clock, Search, UtensilsCrossed } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { PressableScale } from '~/components/ui/PressableScale';
import { Text } from '~/components/ui/Text';
import { type Coordinates, type Place, walkFrom } from '~/utils/mapPlaces';
import type { BuildingMatch, SearchMatch } from '~/utils/mapSearch';
import { searchView } from '~/utils/mapSheetView';
import { useTheme } from '~/utils/theme';
import { SHEET_CONTENT_GAP } from './PlaceCard';
import { PlaceRow, placeDetail, RowGroup, SheetRow } from './PlaceRow';
import { PLACE_ICONS, usePlaceColor } from './placeStyle';
import { SheetScrollView } from './SheetScrollView';
import { SkeletonRows } from './SkeletonRows';

export type ResolvedRecent = { kind: 'place'; place: Place } | { kind: 'query'; query: string };

export type PlaceMenuMatch = { place: Place; foods: string[]; menus: string[] };

const QUICK_SEARCHES = [
  { label: 'Coffee', query: 'coffee', type: 'Coffee Shop' },
  { label: 'Dining halls', query: 'dining hall', type: 'Dining Hall' },
  { label: 'Food trucks', query: 'food truck', type: 'Food Truck' },
  { label: 'Markets', query: 'market', type: 'Convenience Store' },
  { label: 'Microwaves', query: 'microwave', type: 'microwave' },
] as const;

const QuickSearch = ({
  label,
  type,
  onPress,
}: {
  label: string;
  type: string;
  onPress: () => void;
}) => {
  const theme = useTheme();
  const Icon = PLACE_ICONS[type];
  const color = usePlaceColor(type);
  return (
    <PressableScale
      testID={`map-quick-${type}`}
      accessibilityRole="button"
      onPress={onPress}
      className="h-[34px] flex-row items-center gap-x-1.5 rounded-full pr-3.5 pl-1.5"
      style={{ backgroundColor: theme.fill }}
    >
      <View
        className="size-6 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        {Icon && <Icon size={13} color="#FFFFFF" />}
      </View>
      <Text variant="subheadline" emphasized>
        {label}
      </Text>
    </PressableScale>
  );
};

const Suggestions = ({
  recents,
  userCoordinates,
  onPickPlace,
  onRunQuery,
  onClearRecents,
}: {
  recents: ResolvedRecent[];
  userCoordinates: Coordinates | null;
  onPickPlace: (place: Place) => void;
  onRunQuery: (query: string) => void;
  onClearRecents: () => void;
}) => {
  const theme = useTheme();
  return (
    <View className="gap-y-5">
      <View className="gap-y-2">
        <Text variant="footnote" emphasized tone="secondary" className="mx-5 uppercase">
          Find nearby
        </Text>
        <View className="mx-4 flex-row flex-wrap gap-2">
          {QUICK_SEARCHES.map((quick) => (
            <QuickSearch
              key={quick.type}
              label={quick.label}
              type={quick.type}
              onPress={() => onRunQuery(quick.query)}
            />
          ))}
        </View>
      </View>
      {recents.length > 0 && (
        <View className="gap-y-1.5">
          <View className="mx-5 flex-row items-center justify-between">
            <Text variant="footnote" emphasized tone="secondary" className="uppercase">
              Recents
            </Text>
            <Pressable
              testID="map-recents-clear"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClearRecents}
            >
              <Text variant="footnote" tone="tint">
                Clear
              </Text>
            </Pressable>
          </View>
          <RowGroup>
            {recents.map((recent, index) =>
              recent.kind === 'place' ? (
                <PlaceRow
                  key={`place-${recent.place.name}`}
                  place={recent.place}
                  walk={walkFrom(userCoordinates, recent.place)}
                  isFirst={index === 0}
                  onPress={() => onPickPlace(recent.place)}
                />
              ) : (
                <SheetRow
                  key={`query-${recent.query}`}
                  title={recent.query}
                  detail="Search"
                  type="search"
                  Icon={Clock}
                  iconColor={theme.secondaryLabel}
                  isFirst={index === 0}
                  onPress={() => onRunQuery(recent.query)}
                />
              ),
            )}
          </RowGroup>
        </View>
      )}
    </View>
  );
};

const NoResults = ({ query, onClear }: { query: string; onClear: () => void }) => {
  const theme = useTheme();
  return (
    <View testID="map-search-empty" className="mx-8 mt-6 items-center gap-y-2">
      <Search size={28} color={theme.tertiaryLabel} />
      <Text variant="headline" className="text-center">
        {`No results for “${query}”`}
      </Text>
      <Text variant="subheadline" tone="secondary" className="text-center">
        Check the spelling, or try a food like “pizza” or a building like “Union”.
      </Text>
      <PressableScale
        testID="map-search-empty-clear"
        accessibilityRole="button"
        onPress={onClear}
        className="mt-2 h-9 justify-center rounded-full px-4"
        style={{ backgroundColor: theme.fill }}
      >
        <Text variant="subheadline" emphasized>
          Clear search
        </Text>
      </PressableScale>
    </View>
  );
};

const matchDetail = (match: SearchMatch<Place>, walk: number | null) =>
  match.reason === 'building' && match.building
    ? `In ${match.building} · ${placeDetail(match.place, walk)}`
    : placeDetail(match.place, walk);

export const SearchPanel = ({
  query,
  searchedQuery,
  isLoaded,
  results,
  buildings,
  menuMatches,
  recents,
  userCoordinates,
  onPickPlace,
  onRunQuery,
  onClearQuery,
  onClearRecents,
}: {
  query: string;
  searchedQuery: string;
  isLoaded: boolean;
  results: SearchMatch<Place>[];
  buildings: BuildingMatch[];
  menuMatches: PlaceMenuMatch[];
  recents: ResolvedRecent[];
  userCoordinates: Coordinates | null;
  onPickPlace: (place: Place, foods?: string[]) => void;
  onRunQuery: (query: string) => void;
  onClearQuery: () => void;
  onClearRecents: () => void;
}) => {
  const theme = useTheme();
  const view = searchView({
    query,
    searchedQuery,
    isLoaded,
    resultCount: results.length + buildings.length + menuMatches.length,
  });

  return (
    <SheetScrollView
      testID="map-search-results"
      containerStyle={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerClassName="gap-y-5 pt-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: SHEET_CONTENT_GAP }}
    >
      {view.kind === 'suggestions' ? (
        <Suggestions
          recents={recents}
          userCoordinates={userCoordinates}
          onPickPlace={(place) => onPickPlace(place)}
          onRunQuery={onRunQuery}
          onClearRecents={onClearRecents}
        />
      ) : view.kind === 'pending' ? (
        <SkeletonRows count={3} testID="map-search-loading" />
      ) : view.kind === 'empty' ? (
        <NoResults query={view.query} onClear={onClearQuery} />
      ) : (
        <>
          {results.length > 0 && (
            <RowGroup title="Places">
              {results.map((match, index) => (
                <PlaceRow
                  key={match.place.name}
                  place={match.place}
                  walk={walkFrom(userCoordinates, match.place)}
                  detail={matchDetail(match, walkFrom(userCoordinates, match.place))}
                  isFirst={index === 0}
                  onPress={() => onPickPlace(match.place)}
                />
              ))}
            </RowGroup>
          )}
          {menuMatches.length > 0 && (
            <RowGroup title="On today’s menus">
              {menuMatches.map((match, index) => (
                <SheetRow
                  key={`menu-${match.place.name}`}
                  testID={`map-menu-row-${match.place.name}`}
                  title={match.place.name}
                  detail={`${match.foods.join(', ')} · ${match.menus.join(', ')}`}
                  type={match.place.type}
                  Icon={UtensilsCrossed}
                  isFirst={index === 0}
                  onPress={() => onPickPlace(match.place, match.foods)}
                />
              ))}
            </RowGroup>
          )}
          {buildings.length > 0 && (
            <RowGroup title="Buildings">
              {buildings.map((building, index) => (
                <SheetRow
                  key={`building-${building.name}`}
                  testID={`map-building-row-${building.name}`}
                  title={building.name}
                  detail={`${building.count} places`}
                  type="building"
                  Icon={Building2}
                  iconColor={theme.secondaryLabel}
                  isFirst={index === 0}
                  onPress={() => onRunQuery(building.name)}
                />
              ))}
            </RowGroup>
          )}
        </>
      )}
    </SheetScrollView>
  );
};
