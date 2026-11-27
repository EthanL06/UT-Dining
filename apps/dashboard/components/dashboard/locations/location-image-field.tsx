import { Paper, Text, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconX } from '@tabler/icons-react';
import type { Location } from '@/types/location';

interface LocationImageFieldProps {
  form: UseFormReturnType<Location>;
  imageError: boolean;
  setImageError: (value: boolean) => void;
}

export function LocationImageField({ form, imageError, setImageError }: LocationImageFieldProps) {
  return (
    <div>
      <TextInput
        label="Image URL"
        description="Image for dining location (optional)"
        placeholder="Enter image URL"
        variant="filled"
        {...form.getInputProps('image')}
        onChange={(event) => {
          form.getInputProps('image').onChange(event);
          if (imageError) {
            setImageError(false);
          }
        }}
        error={imageError ? 'Image failed to load. Please check the URL.' : undefined}
      />

      {form.values.image && form.values.image.trim() !== '' && (
        <Paper
          p="md"
          mt="xs"
          withBorder
          style={{
            backgroundColor: 'var(--mantine-color-gray-0)',
            borderStyle: 'dashed',
            borderColor: 'var(--mantine-color-gray-4)',
          }}
        >
          <Text size="xs" c="dimmed" mb="xs">
            Image Preview:
          </Text>
          <div style={{ position: 'relative' }}>
            <img
              src={form.values.image}
              alt="Location preview"
              style={{
                maxHeight: '200px',
                objectFit: 'cover',
                borderRadius: '8px',
                display: 'block',
                aspectRatio: '16/9',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const errorContainer = target.parentElement?.querySelector(
                  '.error-message',
                ) as HTMLElement;
                if (errorContainer) {
                  errorContainer.style.display = 'flex';
                }
                setImageError(true);
              }}
              onLoad={(e) => {
                const target = e.target as HTMLImageElement;
                const errorContainer = target.parentElement?.querySelector(
                  '.error-message',
                ) as HTMLElement;
                if (errorContainer) {
                  errorContainer.style.display = 'none';
                }
                setImageError(false);
              }}
            />
            <div
              className="error-message"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '200px',
                backgroundColor: 'var(--mantine-color-red-0)',
                border: '2px dashed var(--mantine-color-red-3)',
                borderRadius: '8px',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <IconX size={32} color="var(--mantine-color-red-6)" />
              <Text size="sm" c="red" ta="center" fw={500}>
                Failed to load image
              </Text>
              <Text size="xs" c="red" ta="center">
                Please check the URL and try again
              </Text>
            </div>
          </div>
        </Paper>
      )}
    </div>
  );
}
