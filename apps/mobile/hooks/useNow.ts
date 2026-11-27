import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [intervalMs]);
  return now;
};
