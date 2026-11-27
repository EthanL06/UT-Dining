import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { MealTime } from '@/types/location';
import { mealTimeOptions, militaryToTimeInput, timeInputToMilitary } from './location-form-utils';

interface MealTimesFieldsProps {
  mealTimes: MealTime[];
  mealTimesError: string | null;
  addMealTime: () => void;
  removeMealTime: (index: number) => void;
  updateMealTime: (index: number, field: keyof MealTime, value: string | number) => void;
}

export function MealTimesFields({
  mealTimes,
  mealTimesError,
  addMealTime,
  removeMealTime,
  updateMealTime,
}: MealTimesFieldsProps) {
  return (
    <div>
      <Group justify="space-between" align="center">
        <div>
          <Text size="sm" fw={500}>
            Meal Times
          </Text>
          <Text size="xs" c="dimmed" mb="md">
            Define specific meal periods (optional)
          </Text>
        </div>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={addMealTime}
          disabled={mealTimes.length >= mealTimeOptions.length}
        >
          Add Meal Time
        </Button>
      </Group>

      {mealTimes.length > 0 ? (
        <Stack gap={0}>
          {mealTimes.map((mealTime, index) => (
            <div key={index}>
              <Paper p="sm" radius={0} style={{ border: 'none' }}>
                <Group gap="sm" align="flex-end">
                  <Select
                    label="Meal Name"
                    placeholder="Select meal type"
                    data={mealTimeOptions.filter((option) => {
                      if (option.value === mealTime.name) return true;
                      return !mealTimes.some(
                        (meal, mealIndex) => mealIndex !== index && meal.name === option.value,
                      );
                    })}
                    value={mealTime.name}
                    onChange={(value) => updateMealTime(index, 'name', value || '')}
                    style={{ flex: 1 }}
                    searchable
                    clearable
                  />
                  <TextInput
                    label="Start Time"
                    type="time"
                    value={militaryToTimeInput(mealTime.start_time)}
                    onChange={(event) => {
                      const militaryTime = timeInputToMilitary(event.currentTarget.value);
                      updateMealTime(index, 'start_time', militaryTime);
                    }}
                    w={125}
                    variant="filled"
                  />
                  <TextInput
                    label="End Time"
                    type="time"
                    value={militaryToTimeInput(mealTime.end_time)}
                    onChange={(event) => {
                      const militaryTime = timeInputToMilitary(event.currentTarget.value);
                      updateMealTime(index, 'end_time', militaryTime);
                    }}
                    w={125}
                    variant="filled"
                  />
                  <ActionIcon variant="subtle" color="red" onClick={() => removeMealTime(index)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>

              {index < mealTimes.length - 1 && <Divider />}
            </div>
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No meal times defined
        </Text>
      )}
      {mealTimesError && (
        <Text size="xs" c="red" mt="xs">
          {mealTimesError}
        </Text>
      )}
    </div>
  );
}
