import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { RollingText } from '~/components/motion/RollingText';
import { Text } from '~/components/ui/Text';
import { createDateFromString, formatDay } from '~/utils/date';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

const DAY_WIDTH = 46;
const FADE_DISTANCE = 24;
const SLIDE_MS = 260;
const EDGE_DISTANCE = DAY_WIDTH * 4;

type Frames = {
  dayX: Record<string, number>;
  circle: { x: number; y: number; size: number } | null;
};

type DayStripProps = {
  dates: string[];
  selectedDate: string;
  today: string;
  onDateChange: (date: string) => void;
  label: string;
  labelTestID?: string;
  labelAccessory?: ReactNode;
  dayTestID?: (date: string) => string;
  markedDates?: ReadonlySet<string>;
  scrollable?: boolean;
  onReachStart?: () => void;
  onReachEnd?: () => void;
};

const DayNumber = ({
  label,
  color,
  circleLeft,
  indicatorLeft,
  animated,
  selected,
}: {
  label: string;
  color: string;
  circleLeft: number | null;
  indicatorLeft: SharedValue<number>;
  animated: boolean;
  selected: boolean;
}) => {
  const onTintStyle = useAnimatedStyle(() => {
    if (!animated || circleLeft === null) return { opacity: selected ? 1 : 0 };
    const distance = Math.abs(indicatorLeft.value - circleLeft);
    return { opacity: Math.max(0, 1 - distance / FADE_DISTANCE) };
  });

  return (
    <View className="flex-1 items-center justify-center">
      <Text variant="callout" emphasized color={color} style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
      <Reanimated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          },
          onTintStyle,
        ]}
      >
        <Text
          variant="callout"
          emphasized
          color="#FFFFFF"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {label}
        </Text>
      </Reanimated.View>
    </View>
  );
};

export const DayStrip = ({
  dates,
  selectedDate,
  today,
  onDateChange,
  label,
  labelTestID,
  labelAccessory,
  dayTestID,
  markedDates,
  scrollable = false,
  onReachStart,
  onReachEnd,
}: DayStripProps) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [frames, setFrames] = useState<Frames>({ dayX: {}, circle: null });
  const [shownDate, setShownDate] = useState({ date: selectedDate, direction: 1 as 1 | -1 });
  if (shownDate.date !== selectedDate) {
    setShownDate({ date: selectedDate, direction: selectedDate > shownDate.date ? 1 : -1 });
  }
  const left = useSharedValue(0);
  const placed = useSharedValue(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewportWidth = useRef(0);
  const centered = useRef<string | null>(null);

  const circleLeft = (date: string) => {
    const x = frames.dayX[date];
    return x === undefined || frames.circle === null ? null : x + frames.circle.x;
  };
  const selectedLeft = circleLeft(selectedDate);
  const ready = selectedLeft !== null && frames.circle !== null;

  useEffect(() => {
    if (selectedLeft === null) return;
    if (!placed.value || reduceMotion) {
      left.value = selectedLeft;
      placed.value = true;
    } else {
      left.value = withTiming(selectedLeft, {
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
    if (!scrollable || viewportWidth.current === 0 || centered.current === selectedDate) return;
    const firstCentering = centered.current === null;
    centered.current = selectedDate;
    scrollRef.current?.scrollTo({
      x: Math.max(0, selectedLeft + DAY_WIDTH / 2 - viewportWidth.current / 2),
      animated: !firstCentering && !reduceMotion,
    });
  }, [selectedLeft, selectedDate, reduceMotion, left, placed, scrollable]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value }] }));

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentOffset.x < EDGE_DISTANCE) onReachStart?.();
    if (contentOffset.x + layoutMeasurement.width > contentSize.width - EDGE_DISTANCE) {
      onReachEnd?.();
    }
  };

  const row = (
    <View>
      {ready && frames.circle !== null && (
        <Reanimated.View
          pointerEvents="none"
          testID="day-strip-indicator"
          style={[
            {
              position: 'absolute',
              top: frames.circle.y,
              left: 0,
              width: frames.circle.size,
              height: frames.circle.size,
              borderRadius: frames.circle.size / 2,
              backgroundColor: theme.tint,
            },
            indicatorStyle,
          ]}
        />
      )}
      <View className={scrollable ? 'flex-row gap-x-1' : 'flex-row justify-between'}>
        {dates.map((value, index) => {
          const date = createDateFromString(value);
          const isSelected = value === selectedDate;
          const isToday = value === today;
          const isMarked = markedDates?.has(value) ?? false;
          return (
            <Pressable
              key={value}
              testID={dayTestID?.(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={formatDay(date, 'EEEE, MMMM d')}
              onLayout={(event) => {
                const x = event.nativeEvent.layout.x;
                setFrames((current) =>
                  current.dayX[value] === x
                    ? current
                    : { ...current, dayX: { ...current.dayX, [value]: x } },
                );
              }}
              onPress={() => {
                if (isSelected) return;
                haptics.selection();
                onDateChange(value);
              }}
              className="items-center gap-y-1"
              style={{ width: DAY_WIDTH }}
            >
              <Text variant="caption" tone="secondary">
                {formatDay(date, 'EEEEE')}
              </Text>
              <View
                onLayout={
                  index === 0
                    ? (event) => {
                        const { x, y, width } = event.nativeEvent.layout;
                        setFrames((current) =>
                          current.circle?.x === x &&
                          current.circle.y === y &&
                          current.circle.size === width
                            ? current
                            : { ...current, circle: { x, y, size: width } },
                        );
                      }
                    : undefined
                }
                className="size-10 rounded-full"
                style={{
                  backgroundColor: !ready && isSelected ? theme.tint : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: theme.tint,
                }}
              >
                <DayNumber
                  label={formatDay(date, 'd')}
                  color={isToday ? theme.tint : theme.label}
                  circleLeft={circleLeft(value)}
                  indicatorLeft={left}
                  animated={ready && !reduceMotion}
                  selected={isSelected}
                />
              </View>
              {markedDates && (
                <View
                  className="size-1 rounded-full"
                  style={{ backgroundColor: isMarked ? theme.tint : 'transparent' }}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <RollingText
          text={label}
          direction={shownDate.direction}
          variant="subheadline"
          emphasized
          testID={labelTestID}
          className="flex-1"
        />
        {labelAccessory}
      </View>
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onLayout={(event) => {
            viewportWidth.current = event.nativeEvent.layout.width;
          }}
          onScroll={handleScroll}
          scrollEventThrottle={64}
        >
          {row}
        </ScrollView>
      ) : (
        row
      )}
    </View>
  );
};
