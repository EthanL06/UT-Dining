import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Reanimated, {
  Easing,
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

type StripLayout = { width: number | null; circleTop: number | null };

const dayLeft = (index: number, width: number) =>
  index * ((width - DAY_WIDTH) / (DAY_OFFSETS.length - 1)) + (DAY_WIDTH - CIRCLE_SIZE) / 2;

const DayLabels = ({
  days,
  selectedIndex,
  mirror,
  paintSelected = false,
  onCircleLayout,
  onPressDay,
}: {
  days: { value: string; date: Date; offset: number }[];
  selectedIndex: number;
  mirror: boolean;
  paintSelected?: boolean;
  onCircleLayout?: (event: LayoutChangeEvent) => void;
  onPressDay?: (value: string, isSelected: boolean) => void;
}) => {
  const theme = useTheme();
  return (
    <View className="flex-row justify-between">
      {days.map(({ value, date, offset }, index) => {
        const isSelected = index === selectedIndex;
        const isToday = offset === 0;
        const painted = mirror || (paintSelected && isSelected);
        const numberColor = painted ? '#FFFFFF' : isToday ? theme.tint : theme.label;
        const content = (
          <>
            <Text variant="caption" tone="secondary" style={mirror && { color: 'transparent' }}>
              {formatDay(date, 'EEEEE')}
            </Text>
            <View
              onLayout={index === 0 ? onCircleLayout : undefined}
              className="size-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: paintSelected && isSelected ? theme.tint : 'transparent',
                borderWidth: !mirror && isToday && !isSelected ? 1.5 : 0,
                borderColor: theme.tint,
              }}
            >
              <Text variant="callout" emphasized color={numberColor}>
                {formatDay(date, 'd')}
              </Text>
            </View>
          </>
        );
        if (mirror) {
          return (
            <View key={value} className="items-center gap-y-1" style={{ width: DAY_WIDTH }}>
              {content}
            </View>
          );
        }
        return (
          <Pressable
            key={value}
            testID={`menu-day-${offset}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={formatDay(date, 'EEEE, MMMM d')}
            onPress={() => onPressDay?.(value, isSelected)}
            className="items-center gap-y-1"
            style={{ width: DAY_WIDTH }}
          >
            {content}
          </Pressable>
        );
      })}
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
  const [layout, setLayout] = useState<StripLayout>({ width: null, circleTop: null });
  const width = layout.width;
  const circleTop = layout.circleTop;
  const ready = width !== null && circleTop !== null && selectedIndex >= 0;
  const left = useSharedValue(0);
  const placed = useSharedValue(false);

  useEffect(() => {
    if (width === null || selectedIndex < 0) return;
    const target = dayLeft(selectedIndex, width);
    if (!placed.value || reduceMotion) {
      left.value = target;
      placed.value = true;
      return;
    }
    left.value = withTiming(target, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) });
  }, [width, selectedIndex, reduceMotion, left, placed]);

  const windowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value }] }));
  const mirrorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -left.value }] }));

  return (
    <View>
      <Text variant="subheadline" emphasized testID="selected-date" className="mb-2">
        {formatDateForDisplay(selectedDate)}
      </Text>
      <View
        onLayout={(event) => {
          const measured = event.nativeEvent.layout.width;
          setLayout((current) =>
            current.width === measured ? current : { ...current, width: measured },
          );
        }}
      >
        <DayLabels
          days={days}
          selectedIndex={selectedIndex}
          mirror={false}
          paintSelected={!ready}
          onCircleLayout={(event) => {
            const top = event.nativeEvent.layout.y;
            setLayout((current) =>
              current.circleTop === top ? current : { ...current, circleTop: top },
            );
          }}
          onPressDay={(value, isSelected) => {
            if (isSelected) return;
            haptics.selection();
            onDateChange(value);
          }}
        />
        {ready && (
          <Reanimated.View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[
              {
                position: 'absolute',
                top: circleTop,
                left: 0,
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: CIRCLE_SIZE / 2,
                overflow: 'hidden',
                backgroundColor: theme.tint,
              },
              windowStyle,
            ]}
          >
            <Reanimated.View
              style={[{ position: 'absolute', top: -circleTop, left: 0, width }, mirrorStyle]}
            >
              <DayLabels days={days} selectedIndex={selectedIndex} mirror />
            </Reanimated.View>
          </Reanimated.View>
        )}
      </View>
    </View>
  );
};

export default WeekStrip;
