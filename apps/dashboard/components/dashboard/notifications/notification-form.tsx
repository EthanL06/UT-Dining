"use client";

import { useState } from "react";
import {
  Stack,
  Title,
  Paper,
  TextInput,
  Textarea,
  Button,
  Text,
  Group,
  Divider,
  Alert,
  Switch,
  ActionIcon,
  Popover,
  Box,
  Select,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconBell,
  IconInfoCircle,
  IconSend,
  IconMoodSmile,
} from "@tabler/icons-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  NotificationData,
  sendNotification,
  scheduleNotification,
} from "@/app/(private)/dashboard/notifications/action";
import { ConfirmationModal } from "./confirmation-modal";
import { Tables } from "@/types/database.types";

export function NotificationForm({
  notificationTypes,
}: {
  notificationTypes: Tables<"notification_types">[];
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);
  const [titleEmojiOpened, { open: openTitleEmoji, close: closeTitleEmoji }] =
    useDisclosure(false);
  const [bodyEmojiOpened, { open: openBodyEmoji, close: closeBodyEmoji }] =
    useDisclosure(false);

  const form = useForm<NotificationData>({
    initialValues: {
      title: "",
      body: "",
      redirectLink: "",
      scheduledAt: undefined,
      isScheduled: false,
      notification_type_id: "",
    },
    validate: {
      title: (value) => (value.length < 1 ? "Title is required" : null),
      body: (value) => (value.length < 1 ? "Body is required" : null),
      redirectLink: (value) => {
        if (value && value.length > 0) {
          const urlPattern = new RegExp(
            "^(https?:\\/\\/)?" + // protocol
              "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
              "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
              "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
              "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
              "(\\#[-a-z\\d_]*)?$", // fragment locator
            "i",
          );
          return !urlPattern.test(value) ? "Please enter a valid URL" : null;
        }
        return null;
      },
      scheduledAt: (value, values) => {
        if (values.isScheduled && !value) {
          return "Please select a date and time for scheduled notification";
        }
        if (
          values.isScheduled &&
          value &&
          value <= new Date(Date.now() + 60000)
        ) {
          return "Scheduled time must be at least 1 minute in the future";
        }
        return null;
      },
      notification_type_id: (value) =>
        value.length < 1 ? "Notification type is required" : null,
    },
  });

  const handleEmojiClick = (
    emojiData: EmojiClickData,
    field: "title" | "body",
  ) => {
    const currentValue = form.values[field];
    form.setFieldValue(field, currentValue + emojiData.emoji);

    // Close the emoji picker
    if (field === "title") {
      closeTitleEmoji();
    } else {
      closeBodyEmoji();
    }
  };

  const handleSubmit = async (values: NotificationData) => {
    setIsLoading(true);

    try {
      let result;
      if (values.isScheduled) {
        result = await scheduleNotification(values);
      } else {
        result = await sendNotification(values);
      }

      if (result.success) {
        notifications.show({
          title: "Success!",
          message: result.message,
          color: "green",
        });

        close();
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to send notification. Please try again.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Paper withBorder p="xl" radius="md">
        <Stack gap="lg">
          <Group>
            <IconBell size={24} />
            <Title order={2}>Send Push Notification</Title>
          </Group>

          <Alert
            icon={<IconInfoCircle size={16} />}
            title="Push Notification Guidelines"
            color="blue"
            variant="light"
          >
            <Text size="sm">
              Keep your title concise (under 50 characters) and body informative
              (under 150 characters) for optimal display across all devices.
            </Text>
          </Alert>

          <form onSubmit={form.onSubmit(open)}>
            <Stack gap="md">
              <Box>
                <TextInput
                  label="Notification Title"
                  placeholder="Enter notification title"
                  required
                  rightSection={
                    <Popover
                      opened={titleEmojiOpened}
                      onClose={closeTitleEmoji}
                      width={350}
                      position="bottom-end"
                      withArrow
                    >
                      <Popover.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={
                            titleEmojiOpened ? closeTitleEmoji : openTitleEmoji
                          }
                        >
                          <IconMoodSmile size={16} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown p={0}>
                        <EmojiPicker
                          onEmojiClick={(emojiData) =>
                            handleEmojiClick(emojiData, "title")
                          }
                          width={350}
                          height={400}
                        />
                      </Popover.Dropdown>
                    </Popover>
                  }
                  {...form.getInputProps("title")}
                />
              </Box>

              <Box>
                <Textarea
                  label="Notification Body"
                  placeholder="Enter notification message"
                  required
                  minRows={3}
                  maxRows={6}
                  autosize
                  rightSection={
                    <Popover
                      opened={bodyEmojiOpened}
                      onClose={closeBodyEmoji}
                      width={350}
                      position="bottom-end"
                      withArrow
                    >
                      <Popover.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={
                            bodyEmojiOpened ? closeBodyEmoji : openBodyEmoji
                          }
                          style={{ marginTop: "4px" }}
                        >
                          <IconMoodSmile size={16} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown p={0}>
                        <EmojiPicker
                          onEmojiClick={(emojiData) =>
                            handleEmojiClick(emojiData, "body")
                          }
                          width={350}
                          height={400}
                        />
                      </Popover.Dropdown>
                    </Popover>
                  }
                  {...form.getInputProps("body")}
                />
              </Box>

              <Select
                label="Notification Type"
                placeholder="Select notification type"
                required
                data={notificationTypes.map((type) => ({
                  value: type.id,
                  label: type.name,
                }))}
                {...form.getInputProps("notification_type_id")}
              />

              <TextInput
                label="Redirect Link (Optional)"
                placeholder="https://example.com"
                description="Link to open when notification is tapped"
                {...form.getInputProps("redirectLink")}
              />

              <Divider />

              <Switch
                label="Schedule for later"
                description="Send notification at a specific date and time"
                {...form.getInputProps("isScheduled", { type: "checkbox" })}
              />

              {form.values.isScheduled && (
                <DateTimePicker
                  dropdownType="modal"
                  label="Schedule Date & Time"
                  placeholder="Select date and time"
                  required
                  minDate={new Date(Date.now() + 60000)}
                  timePickerProps={{
                    withDropdown: true,
                    popoverProps: {
                      withinPortal: false,
                    },
                    format: "12h",
                  }}
                  {...form.getInputProps("scheduledAt")}
                />
              )}

              <Group justify="flex-end" mt="md">
                <Button type="submit" leftSection={<IconSend size={16} />}>
                  {form.values.isScheduled
                    ? "Schedule Notification"
                    : "Send Now"}
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>

      <ConfirmationModal
        opened={opened}
        onClose={close}
        onConfirm={() => handleSubmit(form.values)}
        data={form.values}
        isLoading={isLoading}
      />
    </>
  );
}
