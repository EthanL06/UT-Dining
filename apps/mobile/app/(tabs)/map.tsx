import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import type { Region } from 'react-native-maps';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type MapFilterId, MapSheet, PLACE_ICONS, usePlaceColor } from '~/components/map/MapSheet';
import { MICROWAVE_LOCATIONS } from '~/data/MicrowaveLocations';
import { useDatabase } from '~/hooks/useDatabase';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { getLocationName } from '~/utils/locations';
import {
  type Cluster,
  type Coordinates,
  clusterPlaces,
  type Place,
  regionAround,
  zoomLevelFor,
} from '~/utils/mapPlaces';
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

const coordinatesMatch = (a: Coordinates, b: Coordinates) =>
  Math.abs(a.latitude - b.latitude) < 1e-6 && Math.abs(a.longitude - b.longitude) < 1e-6;

const shortCloseTime = (status: string) =>
  status.match(/until (\d+)(?::(\d+))? (AM|PM)/)
    ? status.replace(/^Open until (\d+)(?::00)? (AM|PM)$/, '$1 $2').replace(/^Open until /, '')
    : '';

const IconPin = ({ place, selected }: { place: Place; selected: boolean }) => {
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

const ClosedDot = () => (
  <View
    className="size-3 rounded-full"
    style={{ backgroundColor: '#8E8E93', borderWidth: 2, borderColor: '#FFFFFF' }}
  />
);

const LabelPin = ({ place }: { place: Place }) => {
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
      <Text
        numberOfLines={1}
        className="max-w-40 font-semibold text-[13px]"
        style={{ color: theme.label }}
      >
        {place.name}
      </Text>
      {closes !== '' && (
        <Text className="text-[13px]" style={{ color: theme.secondaryLabel }}>
          {closes}
        </Text>
      )}
    </View>
  );
};

const ClusterPin = ({ cluster }: { cluster: Cluster }) => {
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
      <Text className="font-bold text-[15px] text-white">{cluster.places.length}</Text>
    </View>
  );
};

const MapPage = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const db = useDatabase();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Set<MapFilterId>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const bottomOffset = TAB_BAR_CLEARANCE + insets.bottom - 34;

  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setMinuteTick((tick) => tick + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const { data } = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(db),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setHasLocationPermission(true);
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 },
        (location) => setUserCoordinates(location.coords),
      );
      if (cancelled) sub.remove();
      else subscription = sub;
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute open status after each sync and every minute
  const places: Place[] = useMemo(() => {
    const now = new Date();
    const withMenus = getLocationIdsWithMenus(db, getTodayInCentralTime());
    const dining = (data?.locations ?? [])
      .filter((location) => location.latitude !== null && location.longitude !== null)
      .map((location) => {
        const isOpen = isLocationOpenNow(location, withMenus, now);
        return {
          name: getLocationName(db, location.name ?? '', useColloquialNames),
          address: location.address,
          description: location.description,
          coordinates: {
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
          },
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
  }, [data, db, useColloquialNames, lastSyncedAt, minuteTick]);

  const filteredPlaces = useMemo(() => {
    const typeFilters: string[] = [...filters].filter((id) => id !== 'open');
    const needle = query.trim().toLowerCase();
    return places.filter(
      (place) =>
        (!filters.has('open') || place.isOpen) &&
        (typeFilters.length === 0 || typeFilters.includes(place.type)) &&
        (needle === '' || place.name.toLowerCase().includes(needle)),
    );
  }, [places, filters, query]);

  const hasFitCampus = useRef(false);
  useEffect(() => {
    if (hasFitCampus.current || sheetHeight === 0) return;
    const dining = places.filter((place) => place.type !== 'microwave');
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
    () => (zoom === 'labels' ? [] : clusterPlaces(filteredPlaces, region, screen.width)),
    [zoom, filteredPlaces, region, screen.width],
  );

  const focusPlace = useCallback((place: Place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlace(place);
    mapRef.current?.animateToRegion(
      { ...place.coordinates, latitudeDelta: 0.003, longitudeDelta: 0.003 },
      450,
    );
  }, []);

  const toggleFilter = useCallback((id: MapFilterId) => {
    setFilters((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const renderPlace = (place: Place) => {
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
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        showsUserLocation={hasLocationPermission}
        showsPointsOfInterests={false}
        onRegionChangeComplete={setRegion}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
        mapPadding={{ top: insets.top, right: 0, bottom: sheetHeight + bottomOffset, left: 0 }}
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    mapRef.current?.animateToRegion(regionAround(cluster.places), 450);
                  }}
                >
                  <ClusterPin cluster={cluster} />
                </Marker>
              ),
            )
          : filteredPlaces.map(renderPlace)}
      </MapView>

      {hasLocationPermission && userCoordinates && (
        <Pressable
          testID="map-locate-button"
          accessibilityLabel="Show my location"
          accessibilityRole="button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        places={filteredPlaces}
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onToggleFilter={toggleFilter}
        selectedPlace={selectedPlace}
        onSelectPlace={focusPlace}
        onClosePlace={() => setSelectedPlace(null)}
        userCoordinates={userCoordinates}
        bottomOffset={bottomOffset}
        onHeightChange={setSheetHeight}
      />
    </View>
  );
};

export default MapPage;
