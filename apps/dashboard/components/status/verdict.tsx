import { Badge, Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconHelpCircle,
} from '@tabler/icons-react';
import type { Issue } from '@/lib/status/issues';
import type { Health } from '@/lib/status/menu-health';
import { HEALTH_COLOR, HEALTH_LABEL, HealthBadge } from './health';

const VERDICT_LABEL: Record<Health, string> = {
  operational: 'All operational',
  degraded: 'Degraded',
  outage: 'Partial outage',
  unknown: 'Unknown',
};

const VERDICT_ICON = {
  operational: IconCircleCheck,
  degraded: IconAlertTriangle,
  outage: IconCircleX,
  unknown: IconHelpCircle,
} satisfies Record<Health, unknown>;

const headlineFor = (issues: Issue[]) => {
  const top = issues[0];
  if (!top) return 'All systems operational';
  const sameKind = issues.filter((issue) => issue.health === top.health);
  if (sameKind.length === 1 || sameKind.every((issue) => issue.headline === top.headline)) {
    return top.headline;
  }
  if (top.health === 'outage') return `${sameKind.length} systems are down`;
  if (top.health === 'degraded') return `${sameKind.length} things need attention`;
  return `${sameKind.length} checks couldn't run`;
};

const summaryFor = (issues: Issue[]) => {
  if (issues.length === 0) return 'Every check passed.';
  const counts = (['outage', 'degraded', 'unknown'] as const)
    .map((health) => {
      const count = issues.filter((issue) => issue.health === health).length;
      return count === 0 ? null : `${count} ${HEALTH_LABEL[health].toLowerCase()}`;
    })
    .filter(Boolean);
  return `${counts.join(', ')}. Everything else is operational.`;
};

export function StatusVerdict({ issues }: { issues: Issue[] }) {
  const health: Health = issues[0]?.health ?? 'operational';
  const color = HEALTH_COLOR[health];
  const Icon = VERDICT_ICON[health];

  return (
    <Card
      withBorder
      radius="md"
      padding={0}
      style={{ borderColor: `var(--mantine-color-${color}-3)`, overflow: 'hidden' }}
    >
      <Group
        gap="md"
        wrap="nowrap"
        align="flex-start"
        p="lg"
        bg={`var(--mantine-color-${color}-0)`}
        style={
          issues.length > 0
            ? { borderBottom: `1px solid var(--mantine-color-${color}-2)` }
            : undefined
        }
      >
        <ThemeIcon color={color} variant="transparent" size={36}>
          <Icon size={34} stroke={1.8} />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fz={22} fw={650} lh={1.25}>
            {headlineFor(issues)}
          </Text>
          <Text fz="sm" c="dimmed">
            {summaryFor(issues)}
          </Text>
        </Stack>
        <Badge color={color} variant="light" radius="sm" visibleFrom="xs">
          {VERDICT_LABEL[health]}
        </Badge>
      </Group>
      {issues.map((issue, index) => (
        <Group
          key={issue.id}
          gap="md"
          px="lg"
          py="sm"
          wrap="wrap"
          style={index > 0 ? { borderTop: '1px solid var(--mantine-color-gray-1)' } : undefined}
        >
          <HealthBadge health={issue.health} w={96} />
          <Stack gap={0} style={{ flex: '1 1 280px', minWidth: 0 }}>
            <Text fz="sm" fw={600}>
              {issue.title}
            </Text>
            <Text fz="sm" c="dimmed">
              {issue.detail}
            </Text>
          </Stack>
          {issue.action && (
            <Button
              component="a"
              href={issue.action.href}
              target={issue.action.href.startsWith('/') ? undefined : '_blank'}
              variant="default"
              size="xs"
            >
              {issue.action.label}
            </Button>
          )}
        </Group>
      ))}
    </Card>
  );
}
