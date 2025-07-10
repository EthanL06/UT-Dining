"use client";

import React, { useState } from "react";
import { ScheduledNotificationsTable } from "@/components/dashboard/notifications";
import { deleteScheduledNotification } from "./action";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { Text, Button, Group } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { Tables } from "@/types/database.types";

type ScheduledNotification = Tables<"notifications">;

interface ScheduledNotificationsClientProps {
  initialNotifications: ScheduledNotification[];
}

export function ScheduledNotificationsClient({
  initialNotifications,
}: ScheduledNotificationsClientProps) {
  const [scheduledNotifications, setScheduledNotifications] =
    useState<ScheduledNotification[]>(initialNotifications);

  const handleDelete = async (id: string) => {
    const notification = scheduledNotifications.find((n) => n.id === id);

    modals.openConfirmModal({
      title: "Delete Scheduled Notification",
      children: (
        <Text size="sm">
          Are you sure you want to delete this scheduled notification? This
          action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          const result = await deleteScheduledNotification(id);

          if (result.success) {
            // Remove the notification from the state
            setScheduledNotifications((prev) =>
              prev.filter((n) => n.id !== id),
            );

            notifications.show({
              title: "Success",
              message: result.message,
              color: "green",
            });
          } else {
            notifications.show({
              title: "Error",
              message: result.message,
              color: "red",
            });
          }
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to delete scheduled notification",
            color: "red",
          });
        }
      },
    });
  };

  return (
    <ScheduledNotificationsTable
      notifications={scheduledNotifications}
      onDelete={handleDelete}
    />
  );
}
