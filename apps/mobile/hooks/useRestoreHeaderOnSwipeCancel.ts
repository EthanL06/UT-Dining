import { type NativeStackNavigationProp, useNavigation } from 'expo-router';
import type { ParamListBase } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';

const SETTLE_DELAY_MS = 700;
const RESHOW_DELAY_MS = 50;

export const useRestoreHeaderOnSwipeCancel = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [cancelCount, setCancelCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const removeCancel = navigation.addListener('gestureCancel', () => {
      setCancelCount((count) => count + 1);
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
  }, [navigation]);

  return cancelCount % 2 === 0 ? 'Back' : 'Back ';
};
