import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toCentralTime } from '@ut-dining/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getLocationMenuData,
  getLocationMenuNames,
  type Location,
} from '~/services/database/database';
import { getTodayInCentralTime } from '~/utils/date';
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

export function useMenuData(location: string, date?: string) {
  const db = useDatabase();
  const queryClient = useQueryClient();
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [isMenuSwitching, setIsMenuSwitching] = useState(false);
  const prevSelectedMenuRef = useRef<string | null>(null);

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
  });

  // Track menu switching state
  useEffect(() => {
    if (defaultMenu && prevSelectedMenuRef.current !== defaultMenu) {
      if (prevSelectedMenuRef.current !== null) {
        setIsMenuSwitching(true);
      }
      prevSelectedMenuRef.current = defaultMenu;
    }
  }, [defaultMenu]);

  // Reset switching state when data is loaded
  useEffect(() => {
    if (!isLoadingMenuData && isMenuSwitching) {
      const timer = setTimeout(() => {
        setIsMenuSwitching(false);
      }, 200); // Small delay to ensure smooth transition
      return () => clearTimeout(timer);
    }
  }, [isLoadingMenuData, isMenuSwitching]);

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
    isSwitchingMenus: isMenuSwitching,
  };
}
