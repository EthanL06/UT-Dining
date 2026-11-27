import { Box, Container, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import type { Metadata } from 'next';
import Image from 'next/image';
import { HEALTH_COLOR, HealthDot } from '@/components/status/health';
import { formatCentralDateTime, formatDay } from '@/lib/status/format';
import { type DayHealth, type Health, worstHealth } from '@/lib/status/menu-health';
import { getMenuStatus } from '@/lib/status/menu-status';
import { probeSupabase, probeWebsite } from '@/lib/status/probes';
import { createAnonClient } from '@/lib/supabase/anon';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'UT Dining Status',
  description: 'Whether UT Dining menus, the app and the website are working right now.',
};

const WEBSITE_URL = process.env.STATUS_WEBSITE_URL ?? 'https://utdining.app';

const STATUS_TEXT: Record<Health, string> = {
  operational: 'Operational',
  degraded: 'Partly working',
  outage: 'Down',
  unknown: 'No data',
};

const BANNER_TEXT: Record<Health, string> = {
  operational: 'Everything is working',
  degraded: 'Some things are not working right',
  outage: 'UT Dining is having problems',
  unknown: 'We could not check everything',
};

interface Component {
  name: string;
  description: string;
  health: Health;
}

const dayTooltip = (day: DayHealth) => {
  if (day.expected === 0) return `${formatDay(day.date)}: no dining halls scheduled`;
  if (day.missing.length === 0) return `${formatDay(day.date)}: all ${day.expected} menus posted`;
  return `${formatDay(day.date)}: ${day.loaded} of ${day.expected} menus posted`;
};

export default async function PublicStatusPage() {
  const supabase = createAnonClient();
  const [menus, backend, website] = await Promise.all([
    getMenuStatus(supabase),
    probeSupabase(),
    probeWebsite(WEBSITE_URL),
  ]);

  const today = menus.todayHealth;
  const menuHealth: Health = menus.ok
    ? worstHealth([menus.freshness, today?.health ?? 'unknown'])
    : backend.health === 'operational'
      ? 'unknown'
      : 'outage';

  const menuDescription = !menus.ok
    ? 'Menu data could not be checked.'
    : menus.freshness === 'outage'
      ? `Menus have not been updated past ${menus.latestMenuDate ? formatDay(menus.latestMenuDate) : 'any day'}.`
      : today && today.expected > 0
        ? today.missing.length === 0
          ? `Today's menus are posted for all ${today.expected} dining halls.`
          : `Today's menus are posted for ${today.loaded} of ${today.expected} dining halls.`
        : 'No dining halls with menus are open today.';

  const components: Component[] = [
    { name: 'Menus', description: menuDescription, health: menuHealth },
    {
      name: 'App service',
      description:
        backend.health === 'operational'
          ? 'The app can load menus, hours and favorites.'
          : 'The app may not load new menus or hours.',
      health: backend.health,
    },
    {
      name: 'Website',
      description:
        website.health === 'operational'
          ? 'utdining.app is up.'
          : 'utdining.app is not responding.',
      health: website.health,
    },
  ];

  const overall = worstHealth(components.map((component) => component.health));
  const incidents = menus.history.filter(
    (day) => day.health === 'outage' || day.health === 'degraded',
  );

  return (
    <Box mih="100vh" bg="gray.0" py={48}>
      <Container size={680}>
        <Stack gap="xl">
          <Group gap="sm">
            <Image src="/logo.png" alt="" width={36} height={36} />
            <Title order={1} fz={22} fw={600}>
              UT Dining Status
            </Title>
          </Group>

          <Paper
            radius="md"
            p="lg"
            bg={`${HEALTH_COLOR[overall]}.6`}
            c="white"
            data-testid="status-banner"
          >
            <Text fw={600} fz="lg">
              {BANNER_TEXT[overall]}
            </Text>
          </Paper>

          <Paper radius="md" withBorder>
            {components.map((component, index) => (
              <Group
                key={component.name}
                justify="space-between"
                wrap="nowrap"
                p="md"
                style={
                  index > 0 ? { borderTop: '1px solid var(--mantine-color-gray-2)' } : undefined
                }
              >
                <Stack gap={2}>
                  <Text fw={600}>{component.name}</Text>
                  <Text fz="sm" c="dimmed">
                    {component.description}
                  </Text>
                </Stack>
                <Group gap={8} wrap="nowrap">
                  <HealthDot health={component.health} />
                  <Text fz="sm" c={`${HEALTH_COLOR[component.health]}.8`} fw={500}>
                    {STATUS_TEXT[component.health]}
                  </Text>
                </Group>
              </Group>
            ))}
          </Paper>

          {menus.history.length > 0 && (
            <Paper radius="md" withBorder p="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={600}>Menus, last 14 days</Text>
                  <Text fz="sm" c="dimmed">
                    {menus.history.filter((day) => day.health === 'operational').length} of{' '}
                    {menus.history.filter((day) => day.health !== 'unknown').length} days complete
                  </Text>
                </Group>
                <Group gap={4} wrap="nowrap">
                  {menus.history.map((day) => (
                    <Tooltip key={day.date} label={dayTooltip(day)} withArrow>
                      <Box
                        h={36}
                        style={{
                          flex: 1,
                          borderRadius: 4,
                          backgroundColor: `var(--mantine-color-${HEALTH_COLOR[day.health]}-${day.health === 'unknown' ? 3 : 5})`,
                        }}
                      />
                    </Tooltip>
                  ))}
                </Group>
                <Group justify="space-between">
                  <Text fz="xs" c="dimmed">
                    {formatDay(menus.history[0].date)}
                  </Text>
                  <Text fz="xs" c="dimmed">
                    Today
                  </Text>
                </Group>
              </Stack>
            </Paper>
          )}

          <Stack gap="sm">
            <Text fw={600}>Recent problems</Text>
            {incidents.length === 0 ? (
              <Text fz="sm" c="dimmed">
                No problems in the last 14 days.
              </Text>
            ) : (
              incidents
                .slice()
                .reverse()
                .map((day) => (
                  <Paper key={day.date} radius="md" withBorder p="md">
                    <Group gap={8} mb={4}>
                      <HealthDot health={day.health} />
                      <Text fw={600} fz="sm">
                        {day.loaded === 0 ? 'No menus posted' : 'Some menus missing'}
                      </Text>
                      <Text fz="sm" c="dimmed">
                        {formatDay(day.date)}
                      </Text>
                    </Group>
                    <Text fz="sm" c="dimmed">
                      {day.missing.length === day.expected
                        ? `No menus were posted for the ${day.expected} dining halls open that day.`
                        : `No menu for ${day.missing.join(', ')}.`}
                    </Text>
                  </Paper>
                ))
            )}
          </Stack>

          <Text fz="xs" c="dimmed" ta="center">
            Checked {formatCentralDateTime(new Date())} Central. This page refreshes every few
            minutes.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
