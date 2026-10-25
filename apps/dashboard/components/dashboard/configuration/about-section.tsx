"use client";

import { useState } from "react";
import {
  Paper,
  Title,
  TextInput,
  Textarea,
  Button,
  Stack,
  Group,
  Text,
} from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type { AppConfig } from "@/types/config";
import { updateAppConfig } from "@/app/(private)/dashboard/configuration/action";

interface AboutSectionProps {
  initialConfig: AppConfig;
}

export function AboutSection({ initialConfig }: AboutSectionProps) {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const updatedConfig = await updateAppConfig(config);
      setConfig(updatedConfig);

      notifications.show({
        title: "Success!",
        message: "About section updated successfully.",
        color: "green",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Failed to update about section:", error);

      notifications.show({
        title: "Error",
        message: "Failed to update about section. Please try again.",
        color: "red",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper p="xl" withBorder>
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">
            About
          </Title>
          <Text size="sm" c="dimmed">
            Configure the app title and description that users will see.
          </Text>
        </div>

        <Stack gap="md">
          <TextInput
            label="About Title"
            placeholder="Enter about title"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            placeholder="Enter app description"
            value={config.description}
            onChange={(e) =>
              setConfig({ ...config, description: e.target.value })
            }
            minRows={3}
            maxRows={6}
            required
            autosize
          />
        </Stack>

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={isLoading}
            disabled={!config.title.trim() || !config.description.trim()}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
