import { useQuery } from '@tanstack/react-query';
import { formatHhmm } from '@ut-dining/core';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StatusDot } from '~/components/ui/Grouped';
import { Text } from '~/components/ui/Text';
import { useDatabase } from '~/hooks/useDatabase';
import { useNow } from '~/hooks/useNow';
import type { Location as LocationRow } from '~/services/database/schema';
import { useMealStripStore } from '~/store/useMealStripStore';
import { useSettingsStore } from '~/store/useSettingsStore';
import { getTodayInCentralTime } from '~/utils/date';
import { haptics } from '~/utils/haptics';
import { displayLocationName } from '~/utils/locationName';
import { getLocationIdsWithMenus, isLocationOpenNow } from '~/utils/locationStatus';
import { readCachedMenuData } from '~/utils/queries';
import { useTheme } from '~/utils/theme';
import { getCurrentMeal } from '~/utils/time';

type Coords = { latitude: number; longitude: number };

const distanceSquared = (a: Coords, b: LocationRow) =>
  b.latitude === null || b.longitude === null
    ? Number.POSITIVE_INFINITY
    : (a.latitude - b.latitude) ** 2 + (a.longitude - b.longitude) ** 2;

const useLastKnownCoords = () => {
  const [coords, setCoords] = useState<Coords | null>(null);
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(({ granted }) => (granted ? Location.getLastKnownPositionAsync() : null))
      .then((position) => position && setCoords(position.coords))
      .catch(() => {});
  }, []);
  return coords;
};

export const useCurrentMealStrip = () => {
  const db = useDatabase();
  const now = useNow();
  const coords = useLastKnownCoords();
  const lastOpenedLocation = useMealStripStore((state) => state.lastOpenedLocation);
  const dismissedMeal = useMealStripStore((state) => state.dismissedMeal);
  const { data } = useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(db),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  return useMemo(() => {
    if (!data) return null;
    const today = getTodayInCentralTime();
    const withMenus = getLocationIdsWithMenus(db, today);
    const candidates = data.locations.flatMap((location) => {
      if (location.type !== 'Dining Hall' || !isLocationOpenNow(location, withMenus, now)) {
        return [];
      }
      const meal = getCurrentMeal(location, now);
      return meal ? [{ location, meal }] : [];
    });
    if (candidates.length === 0) return null;

    const chosen =
      candidates.find((candidate) => candidate.location.name === lastOpenedLocation) ??
      (coords
        ? [...candidates].sort(
            (a, b) => distanceSquared(coords, a.location) - distanceSquared(coords, b.location),
          )[0]
        : candidates[0]);

    const mealKey = `${today}|${chosen.meal.name}`;
    if (mealKey === dismissedMeal) return null;

    return { location: chosen.location, meal: chosen.meal, mealKey };
  }, [data, db, now, coords, lastOpenedLocation, dismissedMeal]);
};

export const MealStrip = ({
  strip,
}: {
  strip: NonNullable<ReturnType<typeof useCurrentMealStrip>>;
}) => {
  const theme = useTheme();
  const useColloquialNames = useSettingsStore((state) => state.useColloquialNames);
  const dismissMeal = useMealStripStore((state) => state.dismissMeal);
  const locationName = strip.location.name ?? '';
  const displayName = displayLocationName(strip.location, useColloquialNames);

  return (
    <Pressable
      testID="meal-strip"
      accessibilityRole="button"
      accessibilityLabel={`${strip.meal.name} at ${displayName}, until ${formatHhmm(strip.meal.end_time)}. Open menu.`}
      onPress={() => {
        router.push({ pathname: '/location/[location]', params: { location: locationName } });
      }}
      className="h-full flex-row items-center gap-x-2.5 pr-2 pl-4"
    >
      <StatusDot open />
      <Text variant="subheadline" emphasized numberOfLines={1} className="flex-1">
        {strip.meal.name} at {displayName}
      </Text>
      <Text variant="subheadline" tone="secondary">
        until {formatHhmm(strip.meal.end_time)}
      </Text>
      <Pressable
        testID="meal-strip-dismiss"
        accessibilityRole="button"
        accessibilityLabel="Hide until the next meal"
        hitSlop={8}
        onPress={() => {
          haptics.tap();
          dismissMeal(strip.mealKey);
        }}
      >
        <View
          className="size-7 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.fill }}
        >
          <X size={14} color={theme.secondaryLabel} />
        </View>
      </Pressable>
    </Pressable>
  );
};
