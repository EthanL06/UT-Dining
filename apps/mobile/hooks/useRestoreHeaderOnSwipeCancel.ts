import { type NativeStackNavigationProp, useNavigation } from 'expo-router';
import type { ParamListBase } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';

export const useRestoreHeaderOnSwipeCancel = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [cancelCount, setCancelCount] = useState(0);

  useEffect(
    () => navigation.addListener('gestureCancel', () => setCancelCount((count) => count + 1)),
    [navigation],
  );

  return cancelCount % 2 === 0 ? 'Back' : 'Back ';
};
