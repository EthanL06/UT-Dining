import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const DURATION_MS = 420;

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export const useCountUp = (target: number) => {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (reduceMotion || from === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      const value = from + (target - from) * easeOutCubic(progress);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    const frame = { current: requestAnimationFrame(step) };
    return () => cancelAnimationFrame(frame.current);
  }, [target, reduceMotion]);

  return shown;
};
