import { Badge, Box } from '@mantine/core';
import type { Health } from '@/lib/status/menu-health';

export const HEALTH_COLOR: Record<Health, string> = {
  operational: 'teal',
  degraded: 'yellow',
  outage: 'red',
  unknown: 'gray',
};

export const HEALTH_LABEL: Record<Health, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  unknown: 'Unknown',
};

export function HealthBadge({ health, label, w }: { health: Health; label?: string; w?: number }) {
  return (
    <Badge color={HEALTH_COLOR[health]} variant="light" radius="sm" w={w}>
      {label ?? HEALTH_LABEL[health]}
    </Badge>
  );
}

export function HealthDot({ health, size = 10 }: { health: Health; size?: number }) {
  return (
    <Box
      component="span"
      w={size}
      h={size}
      style={{
        display: 'inline-block',
        borderRadius: '50%',
        flexShrink: 0,
        backgroundColor: `var(--mantine-color-${HEALTH_COLOR[health]}-6)`,
      }}
    />
  );
}
