"use client";

import React from "react";
import {
  Table,
  Paper,
  Text,
  Badge,
  Group,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import {
  IconTrash,
  IconExternalLink,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { Tables } from "@/types/database.types";

type ScheduledNotification = Tables<"notifications"> & {
  notification_types: Tables<"notification_types">;
};

interface ScheduledNotificationsTableProps {
  notifications: ScheduledNotification[];
  onDelete?: (id: string) => void;
}

export function ScheduledNotificationsTable({
  notifications,
  onDelete,
}: ScheduledNotificationsTableProps) {
  if (notifications.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Text c="dimmed" ta="center" py="xl">
          No scheduled notifications found
        </Text>
      </Paper>
    );
  }

  const handleDelete = (id: string) => {
    onDelete?.(id);
  };

  return (
    <Paper p="md" withBorder>
      <Table striped highlightOnHover withRowBorders={false}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>Message</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Scheduled Time</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Redirect URL</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {notifications.map((notification) => (
            <Table.Tr key={notification.id}>
              {/* Title */}
              <Table.Td>
                <Text fw={500} size="sm">
                  {notification.title || "No title"}
                </Text>
              </Table.Td>

              {/* Message */}
              <Table.Td style={{ maxWidth: 300 }}>
                <Text size="sm" lineClamp={2}>
                  {notification.body || "No message"}
                </Text>
              </Table.Td>

              {/* Notification Type */}
              <Table.Td>
                <Badge color="blue" variant="light">
                  {notification.notification_types.name}
                </Badge>
              </Table.Td>

              {/* Scheduled Time */}
              <Table.Td>
                <Text size="sm">
                  {new Date(notification?.scheduled_at || "").toLocaleString()}
                </Text>
              </Table.Td>

              {/* Status */}
              <Table.Td>
                <Badge
                  color={notification.sent ? "green" : "blue"}
                  variant="light"
                >
                  {notification.sent ? "Sent" : "Pending"}
                </Badge>
              </Table.Td>

              {/* Redirect URL */}
              <Table.Td>
                {notification.redirect_url ? (
                  <Group gap="xs">
                    <Tooltip label={notification.redirect_url}>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        component="a"
                        href={notification.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Text size="xs" c="dimmed">
                      {notification.redirect_url.length > 30
                        ? `${notification.redirect_url.substring(0, 30)}...`
                        : notification.redirect_url}
                    </Text>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    -
                  </Text>
                )}
              </Table.Td>

              {/* Created */}
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {new Date(notification.created_at).toLocaleString()}
                </Text>
              </Table.Td>

              {/* Actions */}
              <Table.Td>
                <Group gap="xs">
                  <Tooltip label="Delete notification">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDelete(notification.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
