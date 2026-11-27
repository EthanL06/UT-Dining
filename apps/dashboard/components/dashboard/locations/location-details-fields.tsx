import { Group, Select, Textarea, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { Location, LocationType } from '@/types/location';

interface LocationDetailsFieldsProps {
  form: UseFormReturnType<Location>;
  locationTypes: LocationType[];
}

export function LocationDetailsFields({ form, locationTypes }: LocationDetailsFieldsProps) {
  return (
    <>
      <Group grow gap="md">
        <TextInput
          label="Name"
          description="Official name of the location"
          placeholder="Enter location name"
          required
          {...form.getInputProps('name')}
        />

        <TextInput
          label="Colloquial Name"
          description="Nickname for the location (optional)"
          placeholder="Enter colloquial name"
          variant="filled"
          {...form.getInputProps('colloquial_name')}
        />
      </Group>

      <Group grow gap="md" align="flex-end">
        <Select
          label="Location Type"
          description="Select the type of dining location"
          placeholder="Choose location type"
          required
          data={locationTypes.map((type) => ({
            value: type.id,
            label: type.name,
          }))}
          {...form.getInputProps('type_id')}
        />
      </Group>

      <Textarea
        label="Description"
        placeholder="Enter location description"
        required
        autosize
        minRows={3}
        {...form.getInputProps('description')}
      />

      <TextInput
        label="Address"
        placeholder="Enter location address"
        required
        {...form.getInputProps('address')}
      />

      <Group grow gap="md">
        <TextInput
          label="Apple Maps Link"
          placeholder="Enter Apple Maps URL"
          required
          {...form.getInputProps('apple_maps_link')}
        />

        <TextInput
          label="Google Maps Link"
          placeholder="Enter Google Maps URL"
          required
          {...form.getInputProps('google_maps_link')}
        />
      </Group>

      <Group grow gap="md">
        <TextInput
          label="Latitude"
          description="Decimal degrees (e.g., 30.2849)"
          placeholder="Enter latitude"
          type="number"
          step="any"
          required
          {...form.getInputProps('latitude')}
        />

        <TextInput
          label="Longitude"
          description="Decimal degrees (e.g., -97.7341)"
          placeholder="Enter longitude"
          type="number"
          step="any"
          required
          {...form.getInputProps('longitude')}
        />
      </Group>
    </>
  );
}
