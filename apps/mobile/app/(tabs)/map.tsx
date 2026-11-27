import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { LocateFixed } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Region } from 'react-native-maps';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrowseList } from '~/components/map/BrowseList';
import { ClosedDot, ClusterPin, IconPin, LabelPin } from '~/components/map/MapPins';
import { MapSheet, type MapSheetHandle } from '~/components/map/MapSheet';
import { PlaceCard } from '~/components/map/PlaceCard';
import type { MapFilterId } from '~/components/map/placeStyle';
import { SearchPanel } from '~/components/map/SearchPanel';
import { MICROWAVE_LOCATIONS } from '~/data/MicrowaveLocations';
import { useDatabase } from '~/hooks/useDatabase';
import { useMapSearch } from '~/hooks/useMapSearch';
import { useNow } from '~/hooks/useNow';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { haptics } from '~/utils/haptics';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { getLocationName } from '~/utils/locations';
import {
  type Coordinates,
  clusterPlaces,
  isPinned,
  type PinnedPlace,
  type Place,
  regionAround,
  zoomLevelFor,
} from '~/utils/mapPlaces';
import { searchPlaces } from '~/utils/mapSearch';
import { readCachedMenuData } from '~/utils/queries';
import { useTheme } from '~/utils/theme';
import { getLocationStatusText } from '~/utils/time';

const INITIAL_REGION: Region = {
  latitude: 30.285548,
  longitude: -97.737384,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const TAB_BAR_CLEARANCE = 92;
const MAP_ATTRIBUTION_GAP = 10;
const MAP_ATTRIBUTION_INSET = 4;

const coordinatesMatch = (a: Coordinates | null, b: Coordinates) =>
  a !== null &&
  Math.abs(a.latitude - b.latitude) < 1e-6 &&
  Math.abs(a.longitude - b.longitude) < 1e-6;

type LocationAccess =
  | { status: 'unknown' }
  | { status: 'denied' }
  | { status: 'granted'; coordinates: Coordinates | null };

const NativeBottomInset = ({ onChange }: { onChange: (bottom: number) => void }) => {
  const { bottom } = useSafeAreaInsets();
  useEffect(() => onChange(bottom), [bottom, onChange]);
  return null;
};

const MapPage = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const db = useDatabase();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [locationAccess, setLocationAccess] = useState<LocationAccess>({ status: 'unknown' });
  const hasLocationPermission = locationAccess.status === 'granted';
  const userCoordinates = locationAccess.status === 'granted' ? locationAccess.coordinates : null;
  const [filters, setFilters] = useState<Set<MapFilterId>>(new Set());
  const [sheetHeight, setSheetHeight] = useState(0);
  const [mapSafeAreaBottom, setMapSafeAreaBottom] = useState(0);
  const bottomOffset = TAB_BAR_CLEARANCE + insets.bottom - 34;

  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const now = useNow();

  const { data } = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(db),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let subscription: Location.LocationSubscription | null = null;
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocationAccess({ status: 'denied' });
          return;
        }
        setLocationAccess((current) =>
          current.status === 'granted' ? current : { status: 'granted', coordinates: null },
        );
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 },
          (location) => setLocationAccess({ status: 'granted', coordinates: location.coords }),
        );
        if (cancelled) sub.remove();
        else subscription = sub;
      })();
      return () => {
        cancelled = true;
        subscription?.remove();
      };
    }, []),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute open status after each sync and every minute
  const places: Place[] = useMemo(() => {
    const withMenus = getLocationIdsWithMenus(db, getTodayInCentralTime());
    const dining = (data?.locations ?? []).map((location): Place => {
      const isOpen = isLocationOpenNow(location, withMenus, now);
      return {
        name: getLocationName(db, location.name ?? '', useColloquialNames),
        locationName: location.name ?? '',
        address: location.address,
        description: location.description,
        coordinates:
          location.latitude !== null && location.longitude !== null
            ? { latitude: Number(location.latitude), longitude: Number(location.longitude) }
            : null,
        type: location.type,
        hasMenu: location.has_menus,
        isOpen,
        status: getLocationStatusText(location, isOpen, now),
      };
    });
    const microwaves = MICROWAVE_LOCATIONS.filter(
      (microwave) =>
        !dining.some((place) => coordinatesMatch(place.coordinates, microwave.coordinates)),
    ).map((microwave) => ({
      ...microwave,
      type: 'microwave',
      hasMenu: false,
      isOpen: true,
      status: 'Microwave',
    }));
    return [...dining, ...microwaves];
  }, [data, db, useColloquialNames, lastSyncedAt, now]);

  const mapSearch = useMapSearch(places);
  const { search, selectedPlace } = mapSearch;

  const filteredPlaces = useMemo(() => {
    const typeFilters: string[] = [...filters].filter((id) => id !== 'open');
    return places.filter(
      (place) =>
        (!filters.has('open') || place.isOpen) &&
        (typeFilters.length === 0 || typeFilters.includes(place.type)),
    );
  }, [places, filters]);

  const searchQuery = search.status === 'place' ? search.query : mapSearch.query.trim() || null;
  const pinnedPlaces = useMemo(() => {
    const shown =
      searchQuery === null
        ? filteredPlaces
        : [
            ...mapSearch.results.map((match) => match.place),
            ...mapSearch.menuMatches.map((match) => match.place),
          ];
    const withSelected =
      selectedPlace && !shown.includes(selectedPlace) ? [...shown, selectedPlace] : shown;
    return [...new Set(withSelected)].filter(isPinned);
  }, [searchQuery, filteredPlaces, mapSearch.results, mapSearch.menuMatches, selectedPlace]);

  const hasFitCampus = useRef(false);
  useEffect(() => {
    if (hasFitCampus.current || sheetHeight === 0) return;
    const dining = places.filter((place) => place.type !== 'microwave').filter(isPinned);
    if (dining.length === 0) return;
    hasFitCampus.current = true;
    mapRef.current?.fitToCoordinates(
      dining.map((place) => place.coordinates),
      {
        edgePadding: { top: insets.top + 24, right: 32, bottom: 32, left: 32 },
        animated: false,
      },
    );
    const timeout = setTimeout(async () => {
      const bounds = await mapRef.current?.getMapBoundaries();
      if (!bounds) return;
      setRegion({
        latitude: (bounds.northEast.latitude + bounds.southWest.latitude) / 2,
        longitude: (bounds.northEast.longitude + bounds.southWest.longitude) / 2,
        latitudeDelta: bounds.northEast.latitude - bounds.southWest.latitude,
        longitudeDelta: bounds.northEast.longitude - bounds.southWest.longitude,
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [places, sheetHeight, insets.top]);

  const zoom = zoomLevelFor(region);
  const screen = useWindowDimensions();
  const clusters = useMemo(
    () => (zoom === 'labels' ? [] : clusterPlaces(pinnedPlaces, region, screen.width)),
    [zoom, pinnedPlaces, region, screen.width],
  );

  const sheetRef = useRef<MapSheetHandle>(null);

  const focusPlace = (place: Place, foods?: string[]) => {
    haptics.tap();
    Keyboard.dismiss();
    mapSearch.pick(place, foods);
    if (place.coordinates) {
      mapRef.current?.animateToRegion(
        { ...place.coordinates, latitudeDelta: 0.003, longitudeDelta: 0.003 },
        450,
      );
    }
  };

  const fitTo = (targets: PinnedPlace[]) => {
    if (targets.length === 1) {
      mapRef.current?.animateToRegion(
        { ...targets[0].coordinates, latitudeDelta: 0.004, longitudeDelta: 0.004 },
        450,
      );
    } else if (targets.length > 1) {
      mapRef.current?.fitToCoordinates(
        targets.map((place) => place.coordinates),
        { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: true },
      );
    }
  };

  const runQuery = (next: string) => {
    Keyboard.dismiss();
    sheetRef.current?.snapTo('half');
    mapSearch.submit(next);
    fitTo(
      searchPlaces(places, next)
        .map((match) => match.place)
        .filter(isPinned),
    );
  };

  const toggleFilter = useCallback((id: MapFilterId) => {
    setFilters((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderPlace = (place: PinnedPlace) => {
    const selected = selectedPlace?.name === place.name;
    const showLabel = zoom === 'labels' && place.isOpen && place.type !== 'microwave';
    const showDot = !place.isOpen && !selected;
    return (
      <Marker
        key={`${place.name}-${showLabel ? 'label' : showDot ? 'dot' : 'pin'}-${selected}`}
        coordinate={place.coordinates}
        tracksViewChanges={false}
        anchor={showLabel ? { x: 0.1, y: 0.5 } : { x: 0.5, y: 0.5 }}
        onPress={() => focusPlace(place)}
        accessibilityLabel={`Map pin, ${place.name}`}
      >
        {showLabel && !selected ? (
          <LabelPin place={place} />
        ) : showDot ? (
          <ClosedDot />
        ) : (
          <IconPin place={place} selected={selected} />
        )}
      </Marker>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="none">
        <NativeBottomInset onChange={setMapSafeAreaBottom} />
      </SafeAreaProvider>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        showsUserLocation={hasLocationPermission}
        showsPointsOfInterests={false}
        onRegionChangeComplete={setRegion}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
        mapPadding={{
          top: insets.top,
          right: 0,
          bottom: Math.max(0, sheetHeight + bottomOffset + MAP_ATTRIBUTION_GAP - mapSafeAreaBottom),
          left: MAP_ATTRIBUTION_INSET,
        }}
        loadingEnabled
        loadingBackgroundColor={theme.background}
      >
        {zoom === 'pins'
          ? clusters.map((cluster) =>
              cluster.places.length === 1 ? (
                renderPlace(cluster.places[0])
              ) : (
                <Marker
                  key={`cluster-${cluster.id}-${cluster.places.length}`}
                  coordinate={cluster.coordinates}
                  tracksViewChanges={false}
                  accessibilityLabel={`${cluster.places.length} places`}
                  onPress={() => {
                    haptics.tap();
                    mapRef.current?.animateToRegion(regionAround(cluster.places), 450);
                  }}
                >
                  <ClusterPin cluster={cluster} />
                </Marker>
              ),
            )
          : pinnedPlaces.map(renderPlace)}
      </MapView>

      {hasLocationPermission && userCoordinates && (
        <Pressable
          testID="map-locate-button"
          accessibilityLabel="Show my location"
          accessibilityRole="button"
          onPress={() => {
            haptics.tap();
            mapRef.current?.animateToRegion(
              { ...userCoordinates, latitudeDelta: 0.005, longitudeDelta: 0.005 },
              450,
            );
          }}
          className="absolute right-4 size-11 items-center justify-center rounded-full"
          style={{
            bottom: bottomOffset + sheetHeight + 12,
            backgroundColor: theme.card,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <LocateFixed size={20} color={theme.tint} />
        </Pressable>
      )}

      <MapSheet
        ref={sheetRef}
        mode={selectedPlace ? 'place' : search.status === 'searching' ? 'search' : 'browse'}
        placeKey={selectedPlace?.name ?? null}
        query={mapSearch.query}
        onQueryChange={mapSearch.setQuery}
        onFocusSearch={mapSearch.focus}
        onCancelSearch={mapSearch.cancel}
        onSubmitSearch={() => runQuery(mapSearch.query)}
        bottomOffset={bottomOffset}
        onHeightChange={setSheetHeight}
      >
        {selectedPlace ? (
          <View style={{ paddingBottom: bottomOffset }}>
            <PlaceCard
              place={selectedPlace}
              userCoordinates={userCoordinates}
              backQuery={search.status === 'place' ? search.query : null}
              foods={mapSearch.selectedFoods}
              onBack={mapSearch.back}
              onClose={mapSearch.close}
            />
          </View>
        ) : search.status === 'searching' ? (
          <SearchPanel
            query={mapSearch.query}
            results={mapSearch.results}
            buildings={mapSearch.buildings}
            menuMatches={mapSearch.menuMatches}
            recents={mapSearch.recents}
            userCoordinates={userCoordinates}
            bottomOffset={bottomOffset}
            onPickPlace={focusPlace}
            onRunQuery={runQuery}
            onClearQuery={() => mapSearch.setQuery('')}
            onClearRecents={mapSearch.clearRecents}
          />
        ) : (
          <BrowseList
            places={filteredPlaces}
            filters={filters}
            userCoordinates={userCoordinates}
            bottomOffset={bottomOffset}
            onToggleFilter={toggleFilter}
            onClearFilters={() => setFilters(new Set())}
            onSelectPlace={focusPlace}
          />
        )}
      </MapSheet>
    </View>
  );
};

export default MapPage;
