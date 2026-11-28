import { useFocusEffect, useNavigation } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTabSwipeStore } from '~/store/useTabSwipeStore';
import { haptics } from '~/utils/haptics';
import {
  dragOffset,
  ENTRY_TRAVEL,
  entryFor,
  neighborTab,
  type SwipeDirection,
  type SwipeTab,
  swipeDirection,
  type TabEntry,
} from '~/utils/tabSwipe';

type TabNavigation = { navigate: (tab: SwipeTab) => void };

export type TabSwipeArea = { kind: 'screen' } | { kind: 'edges'; top: number; bottom: number };

const EDGE_WIDTH = 20;
const ENTRY_OPACITY = 0.4;

const entryOffset = (entry: TabEntry, tab: SwipeTab) => {
  if (entry.kind !== 'entering' || entry.tab !== tab) return 0;
  return entry.from === 'right' ? ENTRY_TRAVEL : -ENTRY_TRAVEL;
};
const SETTLE = { damping: 20, stiffness: 260, mass: 0.6 };
const ENTRY = { duration: 240, easing: Easing.out(Easing.cubic) };

export const TabSwipe = ({
  tab,
  area = { kind: 'screen' },
  blockedBy = [],
  children,
}: {
  tab: SwipeTab;
  area?: TabSwipeArea;
  blockedBy?: GestureType[];
  children: ReactNode;
}) => {
  const navigation = useNavigation<TabNavigation>('/(tabs)');
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(entryOffset(useTabSwipeStore.getState().entry, tab));
  const opacity = useSharedValue(offset.value === 0 ? 1 : ENTRY_OPACITY);

  useEffect(
    () =>
      useTabSwipeStore.subscribe(({ entry }) => {
        const start = entryOffset(entry, tab);
        if (start === 0 || reduceMotion) return;
        offset.value = start;
        opacity.value = ENTRY_OPACITY;
      }),
    [tab, reduceMotion, offset, opacity],
  );

  useFocusEffect(
    useCallback(() => {
      const { entry, setEntry } = useTabSwipeStore.getState();
      if (entry.kind === 'entering' && entry.tab === tab) setEntry({ kind: 'none' });
      offset.value = withTiming(0, ENTRY);
      opacity.value = withTiming(1, ENTRY);
    }, [tab, offset, opacity]),
  );

  const go = useCallback(
    (direction: SwipeDirection) => {
      const target = neighborTab(tab, direction);
      if (!target) return;
      haptics.selection();
      useTabSwipeStore.getState().setEntry(entryFor(tab, direction));
      navigation.navigate(target);
    },
    [tab, navigation],
  );

  const gestures = useMemo(() => {
    const make = () =>
      Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-14, 14])
        .requireExternalGestureToFail(...blockedBy)
        .onUpdate((event) => {
          if (!reduceMotion) offset.value = dragOffset(tab, event.translationX);
        })
        .onEnd((event) => {
          const direction = swipeDirection(event.translationX, event.velocityX);
          if (direction && neighborTab(tab, direction)) {
            runOnJS(go)(direction);
            return;
          }
          offset.value = withSpring(0, SETTLE);
        });
    return { screen: make(), left: make(), right: make() };
  }, [tab, blockedBy, reduceMotion, go, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateX: offset.value }],
  }));

  if (area.kind === 'screen') {
    return (
      <GestureDetector gesture={gestures.screen}>
        <Reanimated.View style={animatedStyle}>{children}</Reanimated.View>
      </GestureDetector>
    );
  }

  const edge = { top: area.top, bottom: area.bottom, width: EDGE_WIDTH };

  return (
    <View style={styles.fill}>
      <Reanimated.View style={animatedStyle}>{children}</Reanimated.View>
      <GestureDetector gesture={gestures.left}>
        <View testID="tab-swipe-left-edge" style={[styles.edge, edge, { left: 0 }]} />
      </GestureDetector>
      <GestureDetector gesture={gestures.right}>
        <View testID="tab-swipe-right-edge" style={[styles.edge, edge, { right: 0 }]} />
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  edge: { position: 'absolute' },
});
