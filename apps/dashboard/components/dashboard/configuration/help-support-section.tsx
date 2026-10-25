"use client";

import { useState } from "react";
import {
  Paper,
  Title,
  TextInput,
  Button,
  Stack,
  Group,
  Text,
  ActionIcon,
} from "@mantine/core";
import { IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import type { HelpSupportConfig, HelpSupportLink } from "@/types/config";
import { updateHelpSupportConfig } from "@/app/(private)/dashboard/configuration/action";

interface HelpSupportSectionProps {
  initialConfig: HelpSupportConfig;
}

const DEFAULT_LINKS = [
  { label: "Contact Support", url: "" },
  { label: "FAQ", url: "" },
  { label: "Privacy Policy", url: "" },
  { label: "Source Code", url: "" },
];

export function HelpSupportSection({ initialConfig }: HelpSupportSectionProps) {
  const [config, setConfig] = useState<HelpSupportConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateLink = (
    id: string,
    field: "label" | "url",
    value: string,
  ) => {
    setConfig({
      ...config,
      links: config.links.map((link) =>
        link.id === id ? { ...link, [field]: value } : link,
      ),
    });
  };

  const handleAddLink = () => {
    const newId = Date.now().toString();
    const newLink: HelpSupportLink = {
      id: newId,
      label: "",
      url: "",
      order: config.links.length + 1,
    };

    setConfig({
      ...config,
      links: [...config.links, newLink],
    });
  };

  const handleDeleteLink = (id: string) => {
    const updatedLinks = config.links
      .filter((link) => link.id !== id)
      .map((link, index) => ({
        ...link,
        order: index + 1,
      }));

    setConfig({
      ...config,
      links: updatedLinks,
    });
  };

  const handleResetToDefaults = () => {
    const defaultLinks: HelpSupportLink[] = DEFAULT_LINKS.map(
      (link, index) => ({
        id: Date.now().toString() + index,
        label: link.label,
        url: link.url,
        order: index + 1,
      }),
    );

    setConfig({
      ...config,
      links: defaultLinks,
    });
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const updatedConfig = await updateHelpSupportConfig(config);
      setConfig(updatedConfig);

      notifications.show({
        title: "Success!",
        message: "Help & Support section updated successfully.",
        color: "green",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Failed to update help & support section:", error);

      notifications.show({
        title: "Error",
        message: "Failed to update help & support section. Please try again.",
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
            Help & Support
          </Title>
          <Text size="sm" c="dimmed">
            Configure help and support links with customizable labels and URLs.
          </Text>
        </div>

        <Stack gap="md">
          <div>
            <Group justify="space-between" align="center" mb="sm">
              <Text size="sm" fw={500}>
                Support Links
              </Text>
              <Group gap="xs">
                <Button
                  variant="light"
                  size="xs"
                  onClick={handleResetToDefaults}
                >
                  Reset to Defaults
                </Button>
                <ActionIcon
                  variant="white"
                  c={"var(--color-UTColors)"}
                  onClick={handleAddLink}
                  size="sm"
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Group>
            </Group>

            {config.links.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No links yet. Click the + button to add one or reset to
                defaults.
              </Text>
            ) : (
              <Stack gap="sm">
                {config.links.map((link) => (
                  <Paper key={link.id} p="sm" withBorder>
                    <Group gap="sm" align="flex-start">
                      <Text
                        size="sm"
                        fw={500}
                        c="dimmed"
                        style={{ minWidth: 40 }}
                      >
                        {link.order}
                      </Text>

                      <Stack gap="xs" style={{ flex: 1 }}>
                        <TextInput
                          label="Label"
                          placeholder="Enter link label"
                          value={link.label}
                          onChange={(e) =>
                            handleUpdateLink(link.id, "label", e.target.value)
                          }
                          size="sm"
                        />
                        <TextInput
                          label="URL"
                          placeholder="Enter URL (e.g., https://example.com)"
                          value={link.url}
                          onChange={(e) =>
                            handleUpdateLink(link.id, "url", e.target.value)
                          }
                          size="sm"
                        />
                      </Stack>

                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteLink(link.id)}
                        mt={28}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </div>
        </Stack>

        <Group justify="flex-end">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={isLoading}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
