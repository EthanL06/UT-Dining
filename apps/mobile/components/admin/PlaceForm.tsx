import { WEEKDAYS } from '@ut-dining/core';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { GroupedSection } from '~/components/ui/Grouped';
import { Image } from '~/components/ui/Image';
import { Text, TextInput } from '~/components/ui/Text';
import type { AdminPlace, PlaceChanges } from '~/services/admin/tools';
import { type HoursDraft, parseHoursDraft, toHoursDraft } from '~/utils/adminHours';
import { checkImageUrl } from '~/utils/adminPlace';
import { useTheme } from '~/utils/theme';

const DAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

export type FormResult =
  | { kind: 'ok'; changes: PlaceChanges }
  | { kind: 'invalid'; message: string };

export const usePlaceForm = (place: AdminPlace) => {
  const [description, setDescription] = useState(place.description);
  const [image, setImage] = useState(place.image ?? '');
  const [hours, setHoursDraft] = useState<HoursDraft>(() => toHoursDraft(place.hours));

  const result = (): FormResult => {
    const imageCheck = checkImageUrl(image);
    if (imageCheck.kind === 'invalid') {
      return { kind: 'invalid', message: 'The photo link has to start with https://.' };
    }
    const parsed = parseHoursDraft(hours);
    if (parsed.kind === 'invalid') {
      const days = parsed.days.map((day) => DAY_LABELS[day]).join(', ');
      return {
        kind: 'invalid',
        message: `Check the hours for ${days}. Use 24-hour times like 07:00-14:00, 16:30-20:00, or leave a day blank for closed.`,
      };
    }
    return {
      kind: 'ok',
      changes: { description: description.trim(), image: imageCheck.url, hours: parsed.hours },
    };
  };

  const setDay = (day: (typeof WEEKDAYS)[number], text: string) =>
    setHoursDraft((current) => ({ ...current, [day]: text }));

  return { description, setDescription, image, setImage, hours, setDay, result };
};

type Form = ReturnType<typeof usePlaceForm>;

const Field = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  testID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  testID: string;
}) => (
  <TextInput
    testID={testID}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    multiline={multiline}
    autoCapitalize={multiline ? 'sentences' : 'none'}
    autoCorrect={multiline}
    className="px-4 py-3"
    style={multiline ? { minHeight: 120, textAlignVertical: 'top' } : undefined}
  />
);

export const PlaceForm = ({ form }: { form: Form }) => {
  const theme = useTheme();
  const preview = checkImageUrl(form.image);

  return (
    <>
      <GroupedSection header="Photo" footer="Paste a link to the photo.">
        {preview.kind === 'ok' && preview.url && (
          <Image source={{ uri: preview.url }} className="h-44 w-full" contentFit="cover" />
        )}
        <Field
          testID="admin-place-image"
          value={form.image}
          onChangeText={form.setImage}
          placeholder="https://"
        />
      </GroupedSection>
      <GroupedSection header="Description">
        <Field
          testID="admin-place-description"
          value={form.description}
          onChangeText={form.setDescription}
          placeholder="What people should know about this place"
          multiline
        />
      </GroupedSection>
      <GroupedSection
        header="Hours"
        footer="24-hour times, like 07:00-14:00, 16:30-20:00. Leave a day blank when it's closed."
      >
        {WEEKDAYS.map((day, index) => (
          <View
            key={day}
            className="flex-row items-center"
            style={index > 0 ? { borderTopWidth: 0.5, borderTopColor: theme.separator } : undefined}
          >
            <Text className="w-16 pl-4">{DAY_LABELS[day]}</Text>
            <TextInput
              testID={`admin-place-hours-${day}`}
              value={form.hours[day]}
              onChangeText={(text) => form.setDay(day, text)}
              placeholder="Closed"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              className="flex-1 py-3 pr-4"
            />
          </View>
        ))}
      </GroupedSection>
    </>
  );
};

export const SaveButton = ({ disabled, onPress }: { disabled: boolean; onPress: () => void }) => (
  <Pressable
    testID="admin-place-save"
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    hitSlop={8}
    style={{ opacity: disabled ? 0.4 : 1 }}
  >
    <Text emphasized tone="tint">
      Save
    </Text>
  </Pressable>
);
