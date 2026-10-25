"use client";

import { useState, useEffect } from "react";
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
import { IconDeviceFloppy, IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { CreditsConfig, Contributor } from "@/types/config";
import { updateCreditsConfig } from "@/app/(private)/dashboard/configuration/action";
import { DraggableContributorItem } from "./draggable-contributor-item";

interface CreditsSectionProps {
  initialConfig: CreditsConfig;
}

function SortableContributorsList({
  contributors,
  onUpdate,
  onDelete,
  onDragEnd,
}: {
  contributors: Contributor[];
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={contributors.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack gap="sm">
          {contributors.map((contributor) => (
            <DraggableContributorItem
              key={contributor.id}
              contributor={contributor}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </Stack>
      </SortableContext>
    </DndContext>
  );
}

export function CreditsSection({ initialConfig }: CreditsSectionProps) {
  const [config, setConfig] = useState<CreditsConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = config.contributors.findIndex((c) => c.id === active.id);
      const newIndex = config.contributors.findIndex((c) => c.id === over.id);

      const newContributors = arrayMove(
        config.contributors,
        oldIndex,
        newIndex,
      );

      // Update order numbers
      const updatedContributors = newContributors.map((contributor, index) => ({
        ...contributor,
        order: index + 1,
      }));

      setConfig({
        ...config,
        contributors: updatedContributors,
      });
    }
  };

  const handleAddContributor = () => {
    const newId = Date.now().toString();
    const newContributor: Contributor = {
      id: newId,
      name: "",
      order: config.contributors.length + 1,
    };

    setConfig({
      ...config,
      contributors: [...config.contributors, newContributor],
    });
  };

  const handleUpdateContributor = (id: string, name: string) => {
    setConfig({
      ...config,
      contributors: config.contributors.map((contributor) =>
        contributor.id === id ? { ...contributor, name } : contributor,
      ),
    });
  };

  const handleDeleteContributor = (id: string) => {
    const updatedContributors = config.contributors
      .filter((contributor) => contributor.id !== id)
      .map((contributor, index) => ({
        ...contributor,
        order: index + 1,
      }));

    setConfig({
      ...config,
      contributors: updatedContributors,
    });
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const updatedConfig = await updateCreditsConfig(config);
      setConfig(updatedConfig);

      notifications.show({
        title: "Success!",
        message: "Credits section updated successfully.",
        color: "green",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Failed to update credits section:", error);

      notifications.show({
        title: "Error",
        message: "Failed to update credits section. Please try again.",
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
            Credits
          </Title>
          <Text size="sm" c="dimmed">
            Configure the open source contributors with drag-and-drop ordering.
          </Text>
        </div>

        <Stack gap="md">
          <div>
            <Group justify="space-between" align="center" mb="sm">
              <Text size="sm" fw={500}>
                Contributors
              </Text>
              <ActionIcon
                variant="white"
                c={"var(--color-UTColors)"}
                onClick={handleAddContributor}
                size="sm"
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>

            {config.contributors.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No contributors yet. Click the + button to add one.
              </Text>
            ) : isClient ? (
              <SortableContributorsList
                contributors={config.contributors}
                onUpdate={handleUpdateContributor}
                onDelete={handleDeleteContributor}
                onDragEnd={handleDragEnd}
              />
            ) : (
              // Non-interactive version for SSR
              <Stack gap="sm">
                {config.contributors.map((contributor) => (
                  <DraggableContributorItem
                    key={contributor.id}
                    contributor={contributor}
                    onUpdate={handleUpdateContributor}
                    onDelete={handleDeleteContributor}
                  />
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
