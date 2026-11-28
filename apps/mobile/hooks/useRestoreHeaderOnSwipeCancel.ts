import { type NativeStackNavigationProp, useNavigation, useRoute } from 'expo-router';
import type { ParamListBase } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';

const SETTLE_DELAY_MS = 700;
const RESHOW_DELAY_MS = 50;
const ZOOM_SCREEN_ID_PARAM = '__internal_expo_router_zoom_transition_screen_id';

const isOpenedWithZoom = (route: { key: string; params?: object }) =>
  !!route.params && (route.params as Record<string, unknown>)[ZOOM_SCREEN_ID_PARAM] === route.key;

export const useRestoreHeaderOnSwipeCancel = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const openedWithZoom = isOpenedWithZoom(useRoute());
  const [cancelCount, setCancelCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const removeCancel = navigation.addListener('gestureCancel', () => {
      setCancelCount((count) => count + 1);
      if (!openedWithZoom) return;
      timers.push(
        setTimeout(() => {
          navigation.setOptions({ headerShown: false });
          timers.push(
            setTimeout(() => navigation.setOptions({ headerShown: true }), RESHOW_DELAY_MS),
          );
        }, SETTLE_DELAY_MS),
      );
    });
    return () => {
      removeCancel();
      for (const timer of timers) clearTimeout(timer);
    };
  }, [navigation, openedWithZoom]);

  return cancelCount % 2 === 0 ? 'Back' : 'Back ';
};
