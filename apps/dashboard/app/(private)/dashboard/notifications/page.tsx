import React from "react";
import { Stack, Title, Divider } from "@mantine/core";
import { NotificationForm } from "@/components/dashboard/notifications";
import { getNotificationTypes, getScheduledNotifications } from "./action";
import { ScheduledNotificationsClient } from "./scheduled-notifications-client";

export default async function NotificationsPage() {
  const notifications = await getScheduledNotifications();
  const notificationTypes = await getNotificationTypes();

  return (
    <Stack component="main" py="md" px="lg">
      <Title order={1}>Push Notifications</Title>
      <NotificationForm notificationTypes={notificationTypes} />

      <Divider my="xl" />

      <Title order={2}>Scheduled Notifications</Title>
      <ScheduledNotificationsClient initialNotifications={notifications} />
    </Stack>
  );
}
