import { Stack, Text, Button, Center, Paper } from "@mantine/core";
import { IconMapPin, IconPlus } from "@tabler/icons-react";

interface EmptyStateProps {
  onAddLocation?: () => void;
}

export function EmptyState({ onAddLocation }: EmptyStateProps) {
  return (
    <Paper p="xl" withBorder>
      <Center>
        <Stack align="center" gap="md" py="xl">
          <IconMapPin size={64} color="var(--mantine-color-gray-4)" />
          <div style={{ textAlign: "center" }}>
            <Text size="lg" fw={500} mb="xs">
              No locations yet
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Get started by adding your first dining location
            </Text>
          </div>
          {onAddLocation && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={onAddLocation}
              variant="light"
            >
              Add First Location
            </Button>
          )}
        </Stack>
      </Center>
    </Paper>
  );
}
