import {
  Anchor,
  Badge,
  Card,
  Group,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from '@mantine/core';
import { toCentralTime } from '@ut-dining/core';
import type { ReactNode } from 'react';
import { HealthBadge, HealthDot } from '@/components/status/health';
import {
  formatBytes,
  formatCentralDateTime,
  formatDay,
  formatDuration,
  formatPercent,
  formatRelative,
} from '@/lib/status/format';
import { type CheckedLocation, getHourProblems, isOpenNow } from '@/lib/status/location-checks';
import type { Health } from '@/lib/status/menu-health';
import { getMenuStatus } from '@/lib/status/menu-status';
import { probeEdgeFunction, probeSupabase } from '@/lib/status/probes';
import { getLatestWorkflowRun } from '@/lib/status/workflows';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface DashboardStatus {
  checked_at: string;
  database_size_bytes: number;
  row_counts: Record<string, number>;
  menu_dates: { oldest: string | null; newest: string | null; newest_updated_at: string | null };
  coverage: {
    date: string;
    items: number;
    missing_nutrition: number;
    missing_ingredients: number;
    missing_allergens: number;
  };
  devices: { total: number; with_push_token: number; active_30_days: number };
  notifications: {
    pending: number;
    next_scheduled_at: string | null;
    last_sent: { title: string | null; body: string | null; type: string; sent_at: string } | null;
  };
}

const WORKFLOWS = [
  { file: 'scraper.yml', label: 'Scraper (production, daily)' },
  { file: 'scraper-dev.yml', label: 'Scraper (dev)' },
  { file: 'dev-supabase-keepalive.yml', label: 'Dev Supabase keepalive' },
  { file: 'ci.yml', label: 'CI' },
];

function StatCard({
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
      <Text fz={24} fw={600} lh={1.2}>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card withBorder radius="md" padding="md">
      <Title order={3} fz="md" mb="sm">
        {title}
      </Title>
      {children}
    </Card>
  );
}

const coverageHealth = (missing: number, total: number): Health => {
  if (total === 0) return 'unknown';
  const share = missing / total;
  if (share > 0.25) return 'outage';
  if (share > 0.05) return 'degraded';
  return 'operational';
};

export default async function StatusPage() {
  const supabase = await createClient();
  const now = toCentralTime();

  const [
    menus,
    statusResult,
    locationResult,
    todayMenusResult,
    changelogResult,
    appInfoResult,
    backend,
    pushFunction,
    workflows,
  ] = await Promise.all([
    getMenuStatus(supabase),
    supabase.rpc('dashboard_status'),
    supabase
      .from('location')
      .select('id, name, has_menus, force_close, regular_service_hours, meal_times, display_order')
      .order('display_order', { ascending: true }),
    supabase.from('menu').select('location_id, name, updated_at').eq('date', now.date),
    supabase
      .from('changelog')
      .select('version, is_published, release_date, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase.from('app_information').select('app_version, updated_at').limit(1),
    probeSupabase(),
    probeEdgeFunction('manual-push-notification'),
    Promise.all(WORKFLOWS.map((workflow) => getLatestWorkflowRun(workflow.file, workflow.label))),
  ]);

  const status = statusResult.error ? null : (statusResult.data as unknown as DashboardStatus);
  const locations = (locationResult.data ?? []) as CheckedLocation[];
  const todayMenus = todayMenusResult.data ?? [];
  const menusByLocation = new Map<string, { names: string[]; updatedAt: string | null }>();
  for (const menu of todayMenus) {
    if (!menu.location_id) continue;
    const entry = menusByLocation.get(menu.location_id) ?? { names: [], updatedAt: null };
    if (menu.name) entry.names.push(menu.name);
    if (menu.updated_at && (!entry.updatedAt || menu.updated_at > entry.updatedAt)) {
      entry.updatedAt = menu.updated_at;
    }
    menusByLocation.set(menu.location_id, entry);
  }

  const today = menus.todayHealth;
  const scraper = workflows[0].health === 'unknown' ? workflows[1] : workflows[0];
  const openNow = locations.filter((location) => isOpenNow(location, now.day, now.time));
  const openWithoutMenu = openNow.filter(
    (location) => location.has_menus && !menusByLocation.has(location.id),
  );
  const forceClosed = locations.filter((location) => location.force_close);
  const hourProblems = locations
    .map((location) => ({ location, problems: getHourProblems(location) }))
    .filter((entry) => entry.problems.length > 0);
  const menuLocations = locations.filter(
    (location) => location.has_menus || menusByLocation.has(location.id),
  );
  const daysAhead =
    menus.latestMenuDate && menus.ok
      ? Math.round(
          (Date.parse(`${menus.latestMenuDate}T12:00:00Z`) -
            Date.parse(`${menus.today}T12:00:00Z`)) /
            86400000,
        )
      : null;
  const changelog = changelogResult.data?.[0] ?? null;
  const appInfo = appInfoResult.data?.[0] ?? null;
  const coverage = status?.coverage;

  return (
    <Stack component="main" py="md" px="lg" gap="lg" maw={1280}>
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={1}>Status</Title>
          <Text c="dimmed">
            Health of the scraper, menu data, locations and services. Checked{' '}
            {formatCentralDateTime(new Date())} Central.
          </Text>
        </Stack>
        <Anchor href="/status" target="_blank" fz="sm">
          Public status page
        </Anchor>
      </Group>

      {!menus.ok && (
        <Card withBorder radius="md" bg="red.0">
          <Text fz="sm">
            The public_status database function did not answer. Apply migration
            20261127010000_add_status_functions to this Supabase project.
          </Text>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          title="Last scraper run"
          health={scraper.health}
          value={scraper.startedAt ? formatRelative(scraper.startedAt) : scraper.state}
        >
          {scraper.startedAt ? (
            <>
              {scraper.label}: {scraper.state} in {formatDuration(scraper.durationSeconds)}.{' '}
              <Anchor href={scraper.url ?? undefined} target="_blank" fz="sm">
                Logs
              </Anchor>
            </>
          ) : (
            scraper.note
          )}
        </StatCard>
        <StatCard
          title="Data freshness"
          health={menus.freshness}
          value={menus.latestMenuDate ? formatDay(menus.latestMenuDate) : 'No menus'}
        >
          {daysAhead === null
            ? 'Newest menu date in the database.'
            : `Newest menu date, ${daysAhead} day${daysAhead === 1 ? '' : 's'} ahead. Last write ${formatRelative(status?.menu_dates.newest_updated_at ?? null)}.`}
        </StatCard>
        <StatCard
          title="Menus loaded today"
          health={today?.health ?? 'unknown'}
          value={today ? `${today.loaded} / ${today.expected}` : '—'}
        >
          {today && today.missing.length > 0
            ? `Missing: ${today.missing.join(', ')}`
            : 'Locations with menus that are open today.'}
        </StatCard>
        <StatCard
          title="Open right now"
          health={openWithoutMenu.length > 0 ? 'degraded' : 'operational'}
          value={`${openNow.length} / ${locations.length}`}
        >
          {openWithoutMenu.length > 0
            ? `Open with no menu: ${openWithoutMenu.map((location) => location.name).join(', ')}`
            : `${forceClosed.length} force-closed.`}
        </StatCard>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Section title={`Menus by location, ${formatDay(menus.today)}`}>
          <Table striped withRowBorders={false} verticalSpacing={6} fz="sm">
            <TableThead>
              <TableTr>
                <TableTh>Location</TableTh>
                <TableTh>Now</TableTh>
                <TableTh>Menus today</TableTh>
                <TableTh>Updated</TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {menuLocations.map((location) => {
                const entry = menusByLocation.get(location.id);
                const expected =
                  today?.missing.includes(location.name ?? 'Unnamed location') ?? false;
                const open = isOpenNow(location, now.day, now.time);
                const health: Health = entry
                  ? 'operational'
                  : expected
                    ? open
                      ? 'outage'
                      : 'degraded'
                    : 'unknown';
                return (
                  <TableTr key={location.id}>
                    <TableTd>
                      <Group gap={8} wrap="nowrap">
                        <HealthDot health={health} size={8} />
                        {location.name}
                      </Group>
                    </TableTd>
                    <TableTd>
                      {location.force_close ? (
                        <Badge color="red" variant="light" size="sm">
                          Force-closed
                        </Badge>
                      ) : open ? (
                        <Badge color="teal" variant="light" size="sm">
                          Open
                        </Badge>
                      ) : (
                        <Badge color="gray" variant="light" size="sm">
                          Closed
                        </Badge>
                      )}
                    </TableTd>
                    <TableTd c={entry ? undefined : 'dimmed'}>
                      {entry ? entry.names.join(', ') : expected ? 'Missing' : 'None expected'}
                    </TableTd>
                    <TableTd c="dimmed">{formatRelative(entry?.updatedAt ?? null)}</TableTd>
                  </TableTr>
                );
              })}
            </TableTbody>
          </Table>
        </Section>

        <Stack gap="md">
          <Section title="Scheduled jobs">
            <Table withRowBorders={false} verticalSpacing={6} fz="sm">
              <TableThead>
                <TableTr>
                  <TableTh>Job</TableTh>
                  <TableTh>Last run</TableTh>
                  <TableTh>Took</TableTh>
                  <TableTh w={140}>Result</TableTh>
                </TableTr>
              </TableThead>
              <TableTbody>
                {workflows.map((run) => (
                  <TableTr key={run.workflow}>
                    <TableTd>
                      <Anchor href={run.url ?? undefined} target="_blank" fz="sm">
                        {run.label}
                      </Anchor>
                    </TableTd>
                    <TableTd c="dimmed">
                      {run.startedAt
                        ? `${formatRelative(run.startedAt)}${run.branch ? ` on ${run.branch}` : ''}`
                        : '—'}
                    </TableTd>
                    <TableTd c="dimmed">{formatDuration(run.durationSeconds)}</TableTd>
                    <TableTd>
                      <HealthBadge health={run.health} label={run.state} />
                    </TableTd>
                  </TableTr>
                ))}
              </TableTbody>
            </Table>
            <Text fz="xs" c="dimmed" mt="xs">
              Until staging is promoted to main, the production scraper still runs on Render, and
              its logs are in the Render dashboard.
            </Text>
          </Section>

          <Section
            title={`Nutrition and allergen coverage${coverage ? `, ${formatDay(coverage.date)}` : ''}`}
          >
            {coverage ? (
              <Stack gap={6}>
                {[
                  { label: 'Missing nutrition facts', missing: coverage.missing_nutrition },
                  { label: 'Missing ingredients', missing: coverage.missing_ingredients },
                  { label: 'Missing allergens', missing: coverage.missing_allergens },
                ].map((row) => (
                  <Group key={row.label} justify="space-between" fz="sm">
                    <Group gap={8}>
                      <HealthDot health={coverageHealth(row.missing, coverage.items)} size={8} />
                      <Text fz="sm">{row.label}</Text>
                    </Group>
                    <Text fz="sm" c="dimmed">
                      {row.missing.toLocaleString()} of {coverage.items.toLocaleString()} items (
                      {formatPercent(row.missing, coverage.items)})
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text fz="sm" c="dimmed">
                Needs the dashboard_status database function.
              </Text>
            )}
          </Section>

          <Section title="Location hours">
            {hourProblems.length === 0 && forceClosed.length === 0 ? (
              <Text fz="sm" c="dimmed">
                No force-closes and no hours that look wrong.
              </Text>
            ) : (
              <List fz="sm" spacing={4}>
                {forceClosed.length > 0 && (
                  <ListItem>
                    <Text span fw={500} fz="sm">
                      Force-closed ({forceClosed.length}):
                    </Text>{' '}
                    {forceClosed.map((location) => location.name).join(', ')}
                  </ListItem>
                )}
                {hourProblems.map(({ location, problems }) => (
                  <ListItem key={`hours-${location.id}`}>
                    <Text span fw={500} fz="sm">
                      {location.name}
                    </Text>
                    : {problems.join('; ')}
                  </ListItem>
                ))}
              </List>
            )}
          </Section>
        </Stack>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Section title="App and users">
          <Stack gap={6} fz="sm">
            <Group justify="space-between">
              <Text fz="sm">Registered devices</Text>
              <Text fz="sm" fw={500}>
                {status?.devices.total.toLocaleString() ?? '—'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">With a push token</Text>
              <Text fz="sm" fw={500}>
                {status?.devices.with_push_token.toLocaleString() ?? '—'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Seen in the last 30 days</Text>
              <Text fz="sm" fw={500}>
                {status?.devices.active_30_days.toLocaleString() ?? '—'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Minimum app version</Text>
              <Text fz="sm" fw={500}>
                {appInfo?.app_version ?? '—'}
              </Text>
            </Group>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Text fz="sm">Last push sent</Text>
              <Text fz="sm" fw={500} ta="right">
                {status?.notifications.last_sent
                  ? `${status.notifications.last_sent.title ?? 'Untitled'}, ${formatRelative(status.notifications.last_sent.sent_at)}`
                  : 'None'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Scheduled, not sent</Text>
              <Text fz="sm" fw={500}>
                {status
                  ? `${status.notifications.pending}${status.notifications.next_scheduled_at ? `, next ${formatCentralDateTime(status.notifications.next_scheduled_at)}` : ''}`
                  : '—'}
              </Text>
            </Group>
          </Stack>
        </Section>

        <Section title="Infrastructure">
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fz="sm">Supabase</Text>
              <Group gap={8}>
                <Text fz="sm" c="dimmed">
                  {[
                    backend.health === 'operational' ? null : backend.detail,
                    backend.latencyMs !== null ? `${backend.latencyMs} ms` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                <HealthBadge health={backend.health} />
              </Group>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Push function</Text>
              <Group gap={8}>
                <Text fz="sm" c="dimmed">
                  {[
                    pushFunction.health === 'operational' ? null : pushFunction.detail,
                    pushFunction.latencyMs !== null ? `${pushFunction.latencyMs} ms` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                <HealthBadge health={pushFunction.health} />
              </Group>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Database size</Text>
              <Text fz="sm" fw={500}>
                {status ? formatBytes(status.database_size_bytes) : '—'}
              </Text>
            </Group>
            {status &&
              Object.entries(status.row_counts).map(([table, count]) => (
                <Group key={table} justify="space-between">
                  <Text fz="sm" ff="monospace">
                    {table}
                  </Text>
                  <Text fz="sm" c="dimmed">
                    {count.toLocaleString()} rows
                  </Text>
                </Group>
              ))}
          </Stack>
        </Section>

        <Stack gap="md">
          <Section title="Content">
            <Stack gap={6}>
              <Group justify="space-between">
                <Text fz="sm">Latest changelog entry</Text>
                <Text fz="sm" fw={500}>
                  {changelog
                    ? `${changelog.version}${changelog.is_published ? '' : ' (hidden)'}`
                    : 'None'}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text fz="sm">Last edited</Text>
                <Text fz="sm" c="dimmed">
                  {formatRelative(changelog?.updated_at ?? null)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text fz="sm">Menu dates stored</Text>
                <Text fz="sm" c="dimmed">
                  {status?.menu_dates.oldest && status.menu_dates.newest
                    ? `${formatDay(status.menu_dates.oldest)} to ${formatDay(status.menu_dates.newest)}`
                    : '—'}
                </Text>
              </Group>
            </Stack>
          </Section>

          <Section title="Not tracked yet">
            <List fz="sm" c="dimmed" spacing={4}>
              <ListItem>Devices by app version: user_devices has no version column.</ListItem>
              <ListItem>Push delivery counts: sends are not logged per device.</ListItem>
              <ListItem>App errors: no Sentry or crash reporting is wired up.</ListItem>
              <ListItem>Vercel deploys: needs a Vercel API token.</ListItem>
            </List>
          </Section>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
