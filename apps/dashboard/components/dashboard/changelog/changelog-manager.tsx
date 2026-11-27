'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { formatCentralDateKey } from '@ut-dining/core';
import { useState, useTransition } from 'react';
import {
  deleteChangelogEntry,
  saveChangelogEntry,
} from '@/app/(private)/dashboard/changelog/action';
import {
  CHANGELOG_ICONS,
  type ChangelogEntry,
  type ChangelogEntryInput,
  type ChangelogIcon,
  compareVersions,
  isValidVersion,
} from '@/types/changelog';
import { ChangelogAppPreview } from './app-preview';
import { CHANGELOG_ICON_OPTIONS, ChangelogIconBadge } from './changelog-icons';

const iconData = CHANGELOG_ICONS.map((value) => ({
  value,
  label: CHANGELOG_ICON_OPTIONS[value].label,
}));

const emptyChange = () => ({ title: '', description: '', icon: 'sparkles' as ChangelogIcon });

const formatDate = (date: string) =>
  formatCentralDateKey(date, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const nextVersion = (entries: ChangelogEntry[]) => {
  const latest = entries[0]?.version;
  if (!latest) return '1.0.0';
  const [major, minor, patch] = latest.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

function ChangelogEditor({
  entry,
  suggestedVersion,
  onClose,
}: {
  entry: ChangelogEntry | null;
  suggestedVersion: string;
  onClose: () => void;
}) {
  const [isSaving, startSaving] = useTransition();
  const form = useForm<ChangelogEntryInput>({
    initialValues: entry
      ? {
          id: entry.id,
          version: entry.version,
          releaseDate: entry.releaseDate,
          summary: entry.summary,
          changes: entry.changes.length ? entry.changes : [emptyChange()],
          isPublished: entry.isPublished,
        }
      : {
          version: suggestedVersion,
          releaseDate: null,
          summary: '',
          changes: [emptyChange()],
          isPublished: false,
        },
    validate: {
      version: (value) => (isValidVersion(value.trim()) ? null : 'Use the format 2.0.0'),
      changes: (value) =>
        value.some((change) => change.title.trim()) ? null : 'Add at least one change',
    },
  });

  const handleSubmit = (values: ChangelogEntryInput) => {
    startSaving(async () => {
      const result = await saveChangelogEntry(values);
      if (!result.success) {
        notifications.show({ color: 'red', title: 'Could not save', message: result.message });
        return;
      }
      notifications.show({
        color: 'green',
        title: 'Saved',
        message: `Version ${values.version.trim()} is saved.`,
      });
      onClose();
    });
  };

  const changes = form.values.changes;

  return (
    <Grid gutter="xl">
      <Grid.Col span={{ base: 12, md: 7 }}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <TextInput
                label="Version"
                placeholder="2.0.0"
                required
                {...form.getInputProps('version')}
              />
              <TextInput
                label="Release date"
                description="Leave empty until it ships"
                type="date"
                value={form.values.releaseDate ?? ''}
                onChange={(event) =>
                  form.setFieldValue('releaseDate', event.currentTarget.value || null)
                }
              />
            </Group>
            <Textarea
              label="Summary"
              description="Optional one-line headline shown above the changes"
              placeholder="A faster, more accurate UT Dining."
              autosize
              minRows={1}
              {...form.getInputProps('summary')}
            />
            <Stack gap="xs">
              <Text fw={600} size="sm">
                Changes
              </Text>
              {changes.map((change, index) => (
                <Card key={form.key(`changes.${index}`)} withBorder padding="sm" radius="md">
                  <Group align="flex-start" wrap="nowrap" gap="xs">
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Select
                        aria-label={`Change ${index + 1} icon`}
                        data={iconData}
                        allowDeselect={false}
                        leftSection={<ChangelogIconBadge icon={change.icon} size={12} />}
                        renderOption={({ option }) => (
                          <Group gap="xs" wrap="nowrap">
                            <ChangelogIconBadge icon={option.value as ChangelogIcon} size={12} />
                            <Text size="sm">{option.label}</Text>
                          </Group>
                        )}
                        w={180}
                        {...form.getInputProps(`changes.${index}.icon`)}
                      />
                      <TextInput
                        placeholder="Title"
                        aria-label={`Change ${index + 1} title`}
                        {...form.getInputProps(`changes.${index}.title`)}
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        aria-label={`Change ${index + 1} description`}
                        autosize
                        minRows={1}
                        {...form.getInputProps(`changes.${index}.description`)}
                      />
                    </Stack>
                    <Stack gap={4}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() =>
                          form.reorderListItem('changes', { from: index, to: index - 1 })
                        }
                      >
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Move down"
                        disabled={index === changes.length - 1}
                        onClick={() =>
                          form.reorderListItem('changes', { from: index, to: index + 1 })
                        }
                      >
                        <IconArrowDown size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Remove change"
                        disabled={changes.length === 1}
                        onClick={() => form.removeListItem('changes', index)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Stack>
                  </Group>
                </Card>
              ))}
              {form.errors.changes && (
                <Text c="red" size="xs">
                  {form.errors.changes}
                </Text>
              )}
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => form.insertListItem('changes', emptyChange())}
              >
                Add change
              </Button>
            </Stack>
            <Switch
              label="Show in the app"
              description="Hidden entries are only visible here"
              {...form.getInputProps('isPublished', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" loading={isSaving}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}>
        <div style={{ position: 'sticky', top: 0 }}>
          <ChangelogAppPreview
            version={form.values.version.trim()}
            releaseDate={form.values.releaseDate}
            summary={form.values.summary}
            changes={form.values.changes}
          />
        </div>
      </Grid.Col>
    </Grid>
  );
}

export function ChangelogManager({ entries }: { entries: ChangelogEntry[] }) {
  const [editing, setEditing] = useState<ChangelogEntry | 'new' | null>(null);
  const [, startDeleting] = useTransition();
  const sorted = [...entries].sort((a, b) => compareVersions(b.version, a.version));

  const confirmDelete = (entry: ChangelogEntry) =>
    modals.openConfirmModal({
      title: `Delete version ${entry.version}?`,
      children: (
        <Text size="sm">
          This removes the entry from the app's changelog. To keep it but hide it, turn off "Show in
          the app" instead.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        startDeleting(async () => {
          const result = await deleteChangelogEntry(entry.id);
          notifications.show(
            result.success
              ? {
                  color: 'green',
                  title: 'Deleted',
                  message: `Version ${entry.version} is deleted.`,
                }
              : { color: 'red', title: 'Could not delete', message: result.message },
          );
        }),
    });

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button leftSection={<IconPlus size={16} />} onClick={() => setEditing('new')}>
          New version
        </Button>
      </Group>

      {sorted.length === 0 && (
        <Card withBorder radius="md" padding="xl">
          <Text c="dimmed" ta="center">
            No changelog entries yet.
          </Text>
        </Card>
      )}

      {sorted.map((entry) => (
        <Card key={entry.id} withBorder radius="md" padding="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={6}>
              <Group gap="xs">
                <Title order={3}>Version {entry.version}</Title>
                {!entry.isPublished && (
                  <Badge color="gray" variant="light">
                    Hidden
                  </Badge>
                )}
              </Group>
              <Text size="sm" c="dimmed">
                {entry.releaseDate ? formatDate(entry.releaseDate) : 'No release date'}
              </Text>
              {entry.summary && <Text>{entry.summary}</Text>}
            </Stack>
            <Group gap={4} wrap="nowrap">
              <Tooltip label="Edit">
                <ActionIcon
                  variant="subtle"
                  aria-label={`Edit version ${entry.version}`}
                  onClick={() => setEditing(entry)}
                >
                  <IconEdit size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={`Delete version ${entry.version}`}
                  onClick={() => confirmDelete(entry)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Stack mt="md" gap="sm">
            {entry.changes.map((change, index) => (
              <Group key={`${entry.id}-${index}`} gap="sm" wrap="nowrap" align="flex-start">
                <ChangelogIconBadge icon={change.icon} />
                <Stack gap={0}>
                  <Text fw={600} size="sm">
                    {change.title}
                  </Text>
                  {change.description && (
                    <Text size="sm" c="dimmed">
                      {change.description}
                    </Text>
                  )}
                </Stack>
              </Group>
            ))}
          </Stack>
        </Card>
      ))}

      <Modal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New version' : `Edit version ${editing?.version ?? ''}`}
        size="80rem"
        centered
      >
        {editing !== null && (
          <ChangelogEditor
            key={editing === 'new' ? 'new' : editing.id}
            entry={editing === 'new' ? null : editing}
            suggestedVersion={nextVersion(sorted)}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </Stack>
  );
}
