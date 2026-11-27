import { Pressable, View } from 'react-native';
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

interface WeekStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const WeekStrip = ({ selectedDate, onDateChange }: WeekStripProps) => {
  const theme = useTheme();
  const today = createDateFromString(getTodayInCentralTime());

  return (
    <View>
      <Text variant="subheadline" emphasized testID="selected-date" className="mb-2">
        {formatDateForDisplay(selectedDate)}
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
              accessibilityLabel={formatDay(day, 'EEEE, MMMM d')}
              onPress={() => {
                if (isSelected) return;
                haptics.selection();
                onDateChange(value);
              }}
              className="items-center gap-y-1"
              style={{ width: 46 }}
            >
              <Text variant="caption" tone="secondary">
                {formatDay(day, 'EEEEE')}
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
                  variant="callout"
                  emphasized
                  color={isSelected ? '#FFFFFF' : isToday ? theme.tint : theme.label}
                >
                  {formatDay(day, 'd')}
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
