import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  type FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const SHOW_AFTER_OFFSET = 500;
const BUTTON_BOTTOM = 40;
const BUTTON_SIZE = 48;

export const SCROLL_TO_TOP_POSITION = { bottom: BUTTON_BOTTOM, size: BUTTON_SIZE };
export const SCROLL_TO_TOP_CLEARANCE = BUTTON_BOTTOM + BUTTON_SIZE + 16;

export const useScrollToTop = <T,>(listRef: React.RefObject<FlatList<T> | null>) => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollButtonAnimation = useRef(new Animated.Value(0)).current;
  const restingTopOffset = useRef<number | null>(null);

  const handleScrollBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;
    if (restingTopOffset.current === null) {
      restingTopOffset.current = Math.min(offset, 0);
    }
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const shouldShow = event.nativeEvent.contentOffset.y > SHOW_AFTER_OFFSET;
      if (shouldShow === showScrollToTop) return;
      setShowScrollToTop(shouldShow);
      Animated.spring(scrollButtonAnimation, {
        toValue: shouldShow ? 1 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();
    },
    [showScrollToTop, scrollButtonAnimation],
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: restingTopOffset.current ?? 0, animated: true });
  }, [listRef]);

  return {
    showScrollToTop,
    scrollButtonAnimation,
    handleScroll,
    handleScrollBeginDrag,
    scrollToTop,
  };
};
