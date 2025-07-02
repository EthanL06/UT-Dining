"use client";

import { Group, Text, ActionIcon, Paper, TextInput } from "@mantine/core";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import type { Contributor } from "@/types/config";

interface DraggableContributorItemProps {
  contributor: Contributor;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function DraggableContributorItemContent({
  contributor,
  onUpdate,
  onDelete,
}: DraggableContributorItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contributor.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper ref={setNodeRef} style={style} p="sm" withBorder>
      <Group gap="sm" align="center">
        <ActionIcon
          variant="subtle"
          color="gray"
          {...attributes}
          {...listeners}
          style={{ cursor: "grab" }}
        >
          <IconGripVertical size={16} />
        </ActionIcon>

        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 40 }}>
          {contributor.order}
        </Text>

        <TextInput
          value={contributor.name}
          onChange={(e) => onUpdate(contributor.id, e.target.value)}
          placeholder="Enter contributor name"
          style={{ flex: 1 }}
          size="sm"
        />

        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => onDelete(contributor.id)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

export function DraggableContributorItem(props: DraggableContributorItemProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Return a non-interactive version for SSR
    return (
      <Paper p="sm" withBorder>
        <Group gap="sm" align="center">
          <ActionIcon variant="subtle" color="gray" disabled>
            <IconGripVertical size={16} />
          </ActionIcon>

          <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 40 }}>
            {props.contributor.order}
          </Text>

          <TextInput
            value={props.contributor.name}
            onChange={(e) =>
              props.onUpdate(props.contributor.id, e.target.value)
            }
            placeholder="Enter contributor name"
            style={{ flex: 1 }}
            size="sm"
          />

          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => props.onDelete(props.contributor.id)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Paper>
    );
  }

  return <DraggableContributorItemContent {...props} />;
}
