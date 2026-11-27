import {
  ActionIcon,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';
import type { Location } from '@/types/location';
import { daysOfWeek, militaryToTimeInput, timeInputToMilitary } from './location-form-utils';

interface ServiceHoursFieldsProps {
  form: UseFormReturnType<Location>;
  serviceHoursError: string | null;
  setServiceHoursError: (value: string | null) => void;
  addTimeRange: (day: keyof Location['regular_service_hours']) => void;
  removeTimeRange: (day: keyof Location['regular_service_hours'], index: number) => void;
  updateTimeRange: (
    day: keyof Location['regular_service_hours'],
    index: number,
    field: 'open' | 'close',
    value: number,
  ) => void;
  getCopyTooltipLabel: (dayIndex: number) => string;
  handleCopyClick: (day: keyof Location['regular_service_hours']) => void;
}

export function ServiceHoursFields({
  form,
  serviceHoursError,
  setServiceHoursError,
  addTimeRange,
  removeTimeRange,
  updateTimeRange,
  getCopyTooltipLabel,
  handleCopyClick,
}: ServiceHoursFieldsProps) {
  return (
    <div>
      <Group align="center" mb="xs" gap={'xs'}>
        <Text size="sm" fw={500}>
          Regular Service Hours
          <Text span size="xs" c="red" ml={4}>
            *
          </Text>
        </Text>

        <Text size="xs" c="dimmed">
          (in CST)
        </Text>
      </Group>

      <Stack gap={0}>
        {daysOfWeek.map((day, index) => (
          <div key={day}>
            <Paper p="sm" pr={0} radius={0} style={{ border: 'none' }}>
              <Group justify="space-between" align="flex-start">
                <Group gap="md" align="flex-start" style={{ flex: 1 }}>
                  <Text size="sm" fw={500} w={80} tt={'capitalize'}>
                    {day}
                  </Text>

                  <Stack gap="xs" style={{ flex: 1 }}>
                    {!form.values.regular_service_hours[day].isClosed ? (
                      <>
                        {form.values.regular_service_hours[day].timeRanges.map(
                          (timeRange, rangeIndex) => (
                            <Group key={rangeIndex} gap="xs" align="center">
                              <Text size="xs" c="dimmed" w={20}>
                                #{rangeIndex + 1}
                              </Text>

                              <TextInput
                                type="time"
                                size="sm"
                                variant="filled"
                                w={125}
                                aria-label={`${day} range ${rangeIndex + 1} start time`}
                                value={militaryToTimeInput(timeRange.open)}
                                onChange={(event) => {
                                  const militaryTime = timeInputToMilitary(
                                    event.currentTarget.value,
                                  );
                                  updateTimeRange(day, rangeIndex, 'open', militaryTime);
                                }}
                              />
                              <Text size="sm" c="dimmed">
                                to
                              </Text>
                              <TextInput
                                type="time"
                                size="sm"
                                w={125}
                                variant="filled"
                                aria-label={`${day} range ${rangeIndex + 1} end time`}
                                value={militaryToTimeInput(timeRange.close)}
                                onChange={(event) => {
                                  const militaryTime = timeInputToMilitary(
                                    event.currentTarget.value,
                                  );
                                  updateTimeRange(day, rangeIndex, 'close', militaryTime);
                                }}
                              />
                              {form.values.regular_service_hours[day].timeRanges.length > 1 && (
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="red"
                                  onClick={() => removeTimeRange(day, rangeIndex)}
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              )}
                            </Group>
                          ),
                        )}

                        <Group gap="xs" mt="xs">
                          <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => addTimeRange(day)}
                            style={{
                              flex: 1,
                            }}
                          >
                            Add Time Range
                          </Button>
                          <Tooltip
                            label={getCopyTooltipLabel(index)}
                            position="top"
                            style={{
                              visibility: index < daysOfWeek.length - 1 ? 'visible' : 'hidden',
                            }}
                          >
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="orange"
                              onClick={() => handleCopyClick(day)}
                              style={{
                                visibility: index < daysOfWeek.length - 1 ? 'visible' : 'hidden',
                              }}
                            >
                              <IconCopy size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </>
                    ) : (
                      <Text size="sm" c="red">
                        Closed
                      </Text>
                    )}
                  </Stack>
                </Group>

                <Tooltip
                  label={
                    form.values.regular_service_hours[day].isClosed
                      ? 'Mark as open'
                      : 'Mark as closed'
                  }
                  position="left"
                >
                  <Switch
                    size="sm"
                    color="orange"
                    checked={!form.values.regular_service_hours[day].isClosed}
                    onChange={(event) => {
                      const isOpen = event.currentTarget.checked;
                      form.setFieldValue(`regular_service_hours.${day}.isClosed`, !isOpen);

                      if (
                        isOpen &&
                        form.values.regular_service_hours[day].timeRanges.length === 0
                      ) {
                        form.setFieldValue(`regular_service_hours.${day}.timeRanges`, [
                          { open: 700, close: 1000 },
                        ]);
                      }

                      if (serviceHoursError) {
                        setServiceHoursError(null);
                      }
                    }}
                  />
                </Tooltip>
              </Group>

              {form.errors[`regular_service_hours.${day}`] && (
                <Text size="xs" c="red" mt="xs">
                  {form.errors[`regular_service_hours.${day}`]}
                </Text>
              )}
            </Paper>

            {index < daysOfWeek.length - 1 && <Divider />}
          </div>
        ))}
      </Stack>
      {serviceHoursError && (
        <Text size="xs" c="red" mt="xs">
          {serviceHoursError}
        </Text>
      )}
    </div>
  );
}
