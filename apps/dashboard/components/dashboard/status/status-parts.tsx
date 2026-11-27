import { Anchor, Card, Group, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { HealthBadge, HealthDot } from '@/components/status/health';
import { formatDuration, formatRelative } from '@/lib/status/format';
import type { Health } from '@/lib/status/menu-health';
import type { Probe } from '@/lib/status/probes';
import type { WorkflowRun } from '@/lib/status/workflows';

export function StatCard({
  title,
  health,
  value,
  children,
}: {
  title: string;
  health: Health;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" mb={6} wrap="nowrap">
        <Text fz="sm" c="dimmed" fw={500}>
          {title}
        </Text>
        <HealthBadge health={health} />
      </Group>
      <Text fz={26} fw={650} lh={1.2}>
        {value}
      </Text>
      {children && (
        <Text fz="sm" c="dimmed" mt={6} component="div">
          {children}
        </Text>
      )}
    </Card>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" mb="sm" gap="xs">
        <Title order={3} fz="md">
          {title}
        </Title>
        {aside}
      </Group>
      {children}
    </Card>
  );
}

export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md" py={5}>
      <Text fz="sm" c="dimmed">
        {label}
      </Text>
      <Text fz="sm" fw={500} ta="right" component="div">
        {children}
      </Text>
    </Group>
  );
}

export function CheckRow({
  name,
  health,
  detail,
  href,
}: {
  name: string;
  health: Health;
  detail: string;
  href?: string | null;
}) {
  return (
    <Group
      gap="sm"
      wrap="nowrap"
      py={8}
      style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}
    >
      <HealthDot health={health} size={8} />
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text fz="sm">
          {href ? (
            <Anchor href={href} target="_blank" fz="sm" c="inherit">
              {name}
            </Anchor>
          ) : (
            name
          )}
        </Text>
        {detail && (
          <Text fz="xs" c="dimmed">
            {detail}
          </Text>
        )}
      </Stack>
      <HealthBadge health={health} />
    </Group>
  );
}

export const probeDetail = (probe: Probe) =>
  [
    probe.health === 'operational' ? null : probe.detail,
    probe.latencyMs === null ? null : `${probe.latencyMs} ms`,
  ]
    .filter(Boolean)
    .join(' · ');

export const runDetail = (run: WorkflowRun) => {
  if (run.startedAt) {
    return [formatRelative(run.startedAt), formatDuration(run.durationSeconds)]
      .filter((part) => part !== '—')
      .join(' · ');
  }
  if (run.state === 'GitHub API 403') return 'GitHub rate limit';
  if (run.state === 'Not on main') return 'Not on main yet';
  return run.state;
};
