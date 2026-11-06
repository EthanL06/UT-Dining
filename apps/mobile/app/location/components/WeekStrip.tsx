import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

import {
  addDaysToDate,
  createDateFromString,
  formatDateForAPI,
  formatDateForDisplay,
  getTodayInCentralTime,
} from '~/utils/date';
import { useTheme } from '~/utils/theme';

const DAY_OFFSETS = [-2, -1, 0, 1, 2, 3];

interface WeekStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const WeekStrip = ({ selectedDate, onDateChange }: WeekStripProps) => {
  const theme = useTheme();
  const today = createDateFromString(getTodayInCentralTime());

  return (
    <View>
      <Text
        testID="selected-date"
        className="mb-2 font-semibold text-[15px]"
        style={{ color: theme.label }}
      >
        {formatDateForDisplay(createDateFromString(selectedDate))}
      </Text>
      <View className="flex-row justify-between">
        {DAY_OFFSETS.map((offset) => {
          const day = addDaysToDate(today, offset);
          const value = formatDateForAPI(day);
          const isSelected = value === selectedDate;
          const isToday = offset === 0;

          return (
            <Pressable
              key={value}
              testID={`menu-day-${offset}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={format(day, 'EEEE, MMMM d')}
              onPress={() => {
                if (isSelected) return;
                Haptics.selectionAsync();
                onDateChange(value);
              }}
              className="items-center gap-y-1"
              style={{ width: 46 }}
            >
              <Text className="text-[12px]" style={{ color: theme.secondaryLabel }}>
                {format(day, 'EEEEE')}
              </Text>
              <View
                className="size-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isSelected ? theme.tint : 'transparent',
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: theme.tint,
                }}
              >
                <Text
                  className="font-semibold text-[16px]"
                  style={{ color: isSelected ? '#FFFFFF' : isToday ? theme.tint : theme.label }}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default WeekStrip;
