import { Stack, Text, Title } from '@mantine/core';
import { ChangelogManager } from '@/components/dashboard/changelog/changelog-manager';
import { getChangelogEntries } from './action';

export default async function ChangelogPage() {
  const entries = await getChangelogEntries();

  return (
    <Stack component="main" py="md" px="lg" gap="lg">
      <Stack gap={4}>
        <Title order={1}>Changelog</Title>
        <Text c="dimmed">
          Release notes shown in the app's Changelog screen, the What's New popup after an update,
          and the update popup. Hidden entries stay out of the app.
        </Text>
      </Stack>
      <ChangelogManager entries={entries} />
    </Stack>
  );
}
