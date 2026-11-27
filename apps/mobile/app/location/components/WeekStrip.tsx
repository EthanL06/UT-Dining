import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Reanimated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '~/components/ui/Text';

import {
  addDaysToDate,
  createDateFromString,
  formatDateForAPI,
  formatDateForDisplay,
  formatDay,
  getTodayInCentralTime,
} from '~/utils/date';
import { haptics } from '~/utils/haptics';
import { useTheme } from '~/utils/theme';

const DAY_OFFSETS = [-2, -1, 0, 1, 2, 3];
const DAY_WIDTH = 46;
const CIRCLE_SIZE = 40;
const SLIDE_MS = 260;

interface WeekStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

type Frames = {
  dayX: Record<number, number>;
  circle: { x: number; y: number; size: number } | null;
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
    return { opacity: Math.max(0, 1 - distance / (CIRCLE_SIZE * 0.6)) };
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

const WeekStrip = ({ selectedDate, onDateChange }: WeekStripProps) => {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const today = createDateFromString(getTodayInCentralTime());
  const days = DAY_OFFSETS.map((offset) => {
    const date = addDaysToDate(today, offset);
    return { value: formatDateForAPI(date), date, offset };
  });
  const selectedIndex = days.findIndex((day) => day.value === selectedDate);
  const [frames, setFrames] = useState<Frames>({ dayX: {}, circle: null });
  const left = useSharedValue(0);
  const placed = useSharedValue(false);

  const circleLeft = (index: number) => {
    const x = frames.dayX[index];
    return x === undefined || frames.circle === null ? null : x + frames.circle.x;
  };
  const selectedLeft = selectedIndex >= 0 ? circleLeft(selectedIndex) : null;
  const ready = selectedLeft !== null && frames.circle !== null;

  useEffect(() => {
    if (selectedLeft === null) return;
    if (!placed.value || reduceMotion) {
      left.value = selectedLeft;
      placed.value = true;
      return;
    }
    left.value = withTiming(selectedLeft, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) });
  }, [selectedLeft, reduceMotion, left, placed]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value }] }));

  return (
    <View>
      <Text variant="subheadline" emphasized testID="selected-date" className="mb-2">
        {formatDateForDisplay(selectedDate)}
      </Text>
      <View>
        {ready && frames.circle !== null && (
          <Reanimated.View
            pointerEvents="none"
            testID="menu-day-indicator"
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
        <View className="flex-row justify-between">
          {days.map(({ value, date, offset }, index) => {
            const isSelected = index === selectedIndex;
            const isToday = offset === 0;
            return (
              <Pressable
                key={value}
                testID={`menu-day-${offset}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={formatDay(date, 'EEEE, MMMM d')}
                onLayout={(event) => {
                  const x = event.nativeEvent.layout.x;
                  setFrames((current) =>
                    current.dayX[index] === x
                      ? current
                      : { ...current, dayX: { ...current.dayX, [index]: x } },
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
                    circleLeft={circleLeft(index)}
                    indicatorLeft={left}
                    animated={ready && !reduceMotion}
                    selected={isSelected}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default WeekStrip;
