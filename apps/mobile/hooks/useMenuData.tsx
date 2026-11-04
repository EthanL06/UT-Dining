import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toCentralTime } from '@ut-dining/core';
import { useEffect, useMemo, useState } from 'react';
import {
  getLocationMenuData,
  getLocationMenuNames,
  type Location,
} from '~/services/database/database';
import {
  addDaysToDate,
  createDateFromString,
  formatDateForAPI,
  getTodayInCentralTime,
} from '~/utils/date';
import { getMealTimes } from '~/utils/locations';
import { useDatabase } from './useDatabase';

const pickDefaultMenu = (
  menuNames: (string | null)[],
  mealTimes: ReturnType<typeof getMealTimes>,
) => {
  const now = toCentralTime().time;
  const breakfastEnd = mealTimes?.breakfast?.closeTime ?? 1100;
  const lunchEnd = mealTimes?.lunch?.closeTime ?? 1700;
  const meal = now < breakfastEnd ? 'Breakfast' : now < lunchEnd ? 'Lunch' : 'Dinner';
  return menuNames.find((name) => name === meal) ?? menuNames[0];
};

const ADJACENT_DAY_PREFETCH_DELAY_MS = 300;

export function useMenuData(location: string, date?: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // Use provided date or default to today
  const targetDate = date || getTodayInCentralTime();

  // Query for menu names
  const {
    data: menuNames = [],
    isLoading: isLoadingMenuNames,
    error: menuNamesError,
  } = useQuery({
    queryKey: ['menuNames', location, targetDate],
    queryFn: () => getLocationMenuNames(db, location, targetDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: !!location,
  });

  const defaultMenu = useMemo(() => {
    if (selectedMenu && menuNames.includes(selectedMenu)) return selectedMenu;
    return pickDefaultMenu(menuNames, getMealTimes(db, location));
  }, [selectedMenu, menuNames, db, location]);

  // Prefetch all menu data for instant switching
  useEffect(() => {
    if (menuNames.length > 0 && queryClient) {
      menuNames.forEach((menuName) => {
        if (menuName) {
          queryClient.prefetchQuery({
            queryKey: ['menuData', location, menuName, targetDate],
            queryFn: () => getLocationMenuData(db, location, menuName, targetDate),
            staleTime: 5 * 60 * 1000, // 5 minutes
          });
        }
      });
    }
  }, [menuNames, location, db, queryClient, targetDate]);

  // Keep the days next to the selected date ready after the current day has settled
  useEffect(() => {
    if (!location) return;
    const timer = setTimeout(() => {
      for (const offset of [1, -1]) {
        const date = formatDateForAPI(addDaysToDate(createDateFromString(targetDate), offset));
        queryClient
          .fetchQuery({
            queryKey: ['menuNames', location, date],
            queryFn: () => getLocationMenuNames(db, location, date),
            staleTime: 5 * 60 * 1000,
          })
          .then((names) => {
            for (const menuName of names) {
              if (!menuName) continue;
              queryClient.prefetchQuery({
                queryKey: ['menuData', location, menuName, date],
                queryFn: () => getLocationMenuData(db, location, menuName, date),
                staleTime: 5 * 60 * 1000,
              });
            }
          })
          .catch(() => {});
      }
    }, ADJACENT_DAY_PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [location, targetDate, db, queryClient]);

  // Query for current menu data (should be instant due to prefetching)
  const {
    data: menuData = null,
    isLoading: isLoadingMenuData,
    error: menuDataError,
  } = useQuery({
    queryKey: ['menuData', location, defaultMenu, targetDate],
    queryFn: () => getLocationMenuData(db, location, defaultMenu as string, targetDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    enabled: !!location && !!defaultMenu,
    placeholderData: keepPreviousData,
  });

  // Transform menu names to filters format
  const filters = useMemo(
    () =>
      menuNames.map((menuName) => ({
        title: menuName || '',
        id: menuName || '',
      })),
    [menuNames],
  );

  const loading = isLoadingMenuNames || isLoadingMenuData;
  const error = menuNamesError || menuDataError;

  return {
    menuData: menuData as Location | null,
    loading,
    error,
    selectedMenu: defaultMenu,
    setSelectedMenu,
    filters,
  };
}
