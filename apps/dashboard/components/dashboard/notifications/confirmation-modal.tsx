"use client";

import {
  Button,
  Modal,
  Stack,
  Text,
  Divider,
  Box,
  Grid,
  Group,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import { NotificationData } from "@/app/(private)/dashboard/notifications/action";
import { IPhoneNotificationPreview } from "./iphone-notification-preview";

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: NotificationData;
  isLoading: boolean;
}

export function ConfirmationModal({
  opened,
  onClose,
  onConfirm,
  data,
  isLoading,
}: ConfirmationModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirm Notification"
      centered
      size="lg"
    >
      <Stack gap="md">
        <Text>Are you sure you want to send this push notification?</Text>

        <Box
          p="md"
          style={{
            backgroundColor: "var(--mantine-color-gray-0)",
            borderRadius: "var(--mantine-radius-md)",
          }}
        >
          <Text size="sm" fw={600} mb="sm" c="dimmed">
            Details
          </Text>
          <Grid>
            <Grid.Col span={3}>
              <Text size="sm" fw={600}>
                Title:
              </Text>
            </Grid.Col>
            <Grid.Col span={9}>
              <Text size="sm">{data.title}</Text>
            </Grid.Col>

            <Grid.Col span={3}>
              <Text size="sm" fw={600}>
                Message:
              </Text>
            </Grid.Col>
            <Grid.Col span={9}>
              <Text size="sm">{data.body}</Text>
            </Grid.Col>

            {data.redirectLink && (
              <>
                <Grid.Col span={3}>
                  <Text size="sm" fw={600}>
                    Link:
                  </Text>
                </Grid.Col>
                <Grid.Col span={9}>
                  <Text size="sm" c="blue" style={{ wordBreak: "break-all" }}>
                    {data.redirectLink}
                  </Text>
                </Grid.Col>
              </>
            )}

            {data.isScheduled && data.scheduledAt && (
              <>
                <Grid.Col span={3}>
                  <Text size="sm" fw={600}>
                    Scheduled:
                  </Text>
                </Grid.Col>
                <Grid.Col span={9}>
                  <Text size="sm">{data.scheduledAt.toLocaleString()}</Text>
                </Grid.Col>
              </>
            )}
          </Grid>
        </Box>

        <Divider label="Preview" labelPosition="center" />

        <IPhoneNotificationPreview data={data} />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={isLoading}
            leftSection={<IconSend size={16} />}
          >
            {data.isScheduled ? "Schedule Notification" : "Send Now"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
