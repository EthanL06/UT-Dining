import { DayStrip } from '~/components/DayStrip';
import {
  addDaysToDate,
  createDateFromString,
  formatDateForAPI,
  formatDateForDisplay,
  getTodayInCentralTime,
} from '~/utils/date';

const DAY_OFFSETS = [-2, -1, 0, 1, 2, 3];

interface WeekStripProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const WeekStrip = ({ selectedDate, onDateChange }: WeekStripProps) => {
  const today = getTodayInCentralTime();
  const todayDate = createDateFromString(today);
  const dates = DAY_OFFSETS.map((offset) => formatDateForAPI(addDaysToDate(todayDate, offset)));
  const offsets = new Map(dates.map((date, index) => [date, DAY_OFFSETS[index]]));

  return (
    <DayStrip
      dates={dates}
      selectedDate={selectedDate}
      today={today}
      onDateChange={onDateChange}
      label={formatDateForDisplay(selectedDate)}
      labelTestID="selected-date"
      dayTestID={(date) => `menu-day-${offsets.get(date)}`}
    />
  );
};

export default WeekStrip;
