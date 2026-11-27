import { Box, Container, Group, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import type { Metadata } from 'next';
import Image from 'next/image';
import { HEALTH_COLOR, HealthDot } from '@/components/status/health';
import { formatCentralDateTime, formatDay } from '@/lib/status/format';
import type { DayHealth, Health } from '@/lib/status/menu-health';
import { getPublicSummary, STATUS_LABEL } from '@/lib/status/public-summary';
import { STATUS_SITE_URL } from '@/lib/status/site';

export const revalidate = 120;

const STATUS_DESCRIPTION =
  'Live status of UT Dining: whether menus for UT Austin dining halls are posted and up to date, and whether the UT Dining app and website are working right now.';

export const metadata: Metadata = {
  metadataBase: new URL(STATUS_SITE_URL),
  title: 'UT Dining Status',
  description: STATUS_DESCRIPTION,
  applicationName: 'UT Dining',
  keywords: ['UT Dining status', 'UT Austin dining', 'dining hall menus', 'UT Dining app'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'UT Dining',
    title: 'UT Dining Status',
    description: STATUS_DESCRIPTION,
    images: [{ url: '/logo.png', width: 96, height: 96, alt: 'UT Dining' }],
  },
  twitter: {
    card: 'summary',
    title: 'UT Dining Status',
    description: STATUS_DESCRIPTION,
    images: ['/logo.png'],
  },
};

const BANNER_TEXT: Record<Health, string> = {
  operational: 'Everything is working',
  degraded: 'Some things are not working right',
  outage: 'UT Dining is having problems',
  unknown: 'We could not check everything',
};

const dayTooltip = (day: DayHealth) => {
  if (day.expected === 0) return `${formatDay(day.date)}: no dining halls scheduled`;
  if (day.missing.length === 0) return `${formatDay(day.date)}: all ${day.expected} menus posted`;
  return `${formatDay(day.date)}: UT posted ${day.loaded} of ${day.expected} menus`;
};

const dayColor = (day: DayHealth) => {
  if (day.health === 'unknown') return 'var(--mantine-color-gray-3)';
  if (day.complete) return 'var(--mantine-color-teal-5)';
  if (day.loaded === 0) return 'var(--mantine-color-gray-4)';
  return 'var(--mantine-color-teal-2)';
};

export default async function PublicStatusPage() {
  const { overall, components, menus } = await getPublicSummary();
  const notes = menus.history.filter((day) => day.health !== 'unknown' && !day.complete);

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
                  {component.note && (
                    <Text fz="xs" c="dimmed" data-testid={`note-${component.id}`}>
                      {component.note}
                    </Text>
                  )}
                </Stack>
                <Group gap={8} wrap="nowrap">
                  <HealthDot health={component.health} />
                  <Text fz="sm" c={`${HEALTH_COLOR[component.health]}.8`} fw={500}>
                    {STATUS_LABEL[component.health]}
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
                    UT posted every menu on{' '}
                    {menus.history.filter((day) => day.health !== 'unknown' && day.complete).length}{' '}
                    of {menus.history.filter((day) => day.health !== 'unknown').length} days
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
                          backgroundColor: dayColor(day),
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
            <Text fw={600}>Days UT didn't post every menu</Text>
            <Text fz="sm" c="dimmed">
              A missing menu usually means that dining hall was closed, like on a holiday or break.
              It isn't a problem with UT Dining.
            </Text>
            {notes.length === 0 ? (
              <Text fz="sm" c="dimmed">
                UT posted every menu in the last 14 days.
              </Text>
            ) : (
              notes
                .slice()
                .reverse()
                .map((day) => (
                  <Paper key={day.date} radius="md" withBorder p="md">
                    <Group gap={8} mb={4}>
                      <Text fw={600} fz="sm">
                        {day.loaded === 0 ? 'No menus posted by UT' : 'Some menus not posted by UT'}
                      </Text>
                      <Text fz="sm" c="dimmed">
                        {formatDay(day.date)}
                      </Text>
                    </Group>
                    <Text fz="sm" c="dimmed">
                      {day.loaded === 0
                        ? `UT didn't post menus for any of the ${day.expected} dining halls that day.`
                        : `UT didn't post a menu for ${day.missing.join(', ')}.`}
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
