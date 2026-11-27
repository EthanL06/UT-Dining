import {
  Accordion,
  AccordionControl,
  AccordionItem,
  AccordionPanel,
  Anchor,
  Badge,
  Card,
  Grid,
  GridCol,
  Group,
  Pill,
  SimpleGrid,
  Stack,
  Table,
  TableScrollContainer,
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
import { StatusVerdict } from '@/components/status/verdict';
import {
  formatBytes,
  formatCentralDateTime,
  formatDay,
  formatDuration,
  formatPercent,
  formatRelative,
} from '@/lib/status/format';
import { buildIssues, coverageHealth } from '@/lib/status/issues';
import { type CheckedLocation, getHourProblems, isOpenNow } from '@/lib/status/location-checks';
import type { Health } from '@/lib/status/menu-health';
import { getMenuStatus } from '@/lib/status/menu-status';
import { type Probe, probeEdgeFunction, probeSupabase, probeWebsite } from '@/lib/status/probes';
import { getLatestWorkflowRun, type WorkflowRun } from '@/lib/status/workflows';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const WEBSITE_URL = process.env.STATUS_WEBSITE_URL ?? 'https://utdining.app';

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
  { file: 'scraper.yml', label: 'Production scraper' },
  { file: 'scraper-dev.yml', label: 'Dev scraper' },
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

function Section({
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

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
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

function CheckRow({
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

const probeDetail = (probe: Probe) =>
  [
    probe.health === 'operational' ? null : probe.detail,
    probe.latencyMs === null ? null : `${probe.latencyMs} ms`,
  ]
    .filter(Boolean)
    .join(' · ');

const runDetail = (run: WorkflowRun) => {
  if (run.startedAt) {
    return [formatRelative(run.startedAt), formatDuration(run.durationSeconds)]
      .filter((part) => part !== '—')
      .join(' · ');
  }
  if (run.state === 'GitHub API 403') return 'GitHub rate limit';
  if (run.state === 'Not on main') return 'Not on main yet';
  return run.state;
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
    website,
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
    probeWebsite(WEBSITE_URL),
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
  const coverage = status?.coverage ?? null;

  const issues = buildIssues({
    supabaseUrl: getSupabaseEnv().url,
    backend,
    pushFunction,
    workflows,
    menus,
    openWithoutMenu,
    hourProblems,
    coverage,
  });

  const rowCounts = status ? Object.entries(status.row_counts) : [];

  return (
    <Stack component="main" py="md" px="lg" gap="lg" maw={1280}>
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Title order={1}>Status</Title>
          <Text c="dimmed">Checked {formatCentralDateTime(new Date())} Central</Text>
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

      <StatusVerdict issues={issues} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          title="Last scraper run"
          health={scraper.health}
          value={scraper.startedAt ? formatRelative(scraper.startedAt) : 'No data'}
        >
          {scraper.startedAt ? (
            <>
              {scraper.label}: {scraper.state} in {formatDuration(scraper.durationSeconds)}.{' '}
              <Anchor href={scraper.url ?? undefined} target="_blank" fz="sm">
                Logs
              </Anchor>
            </>
          ) : (
            (scraper.note ?? scraper.state)
          )}
        </StatCard>
        <StatCard
          title="Data freshness"
          health={menus.freshness}
          value={menus.latestMenuDate ? formatDay(menus.latestMenuDate) : 'No menus'}
        >
          {daysAhead === null
            ? 'Newest menu date in the database.'
            : `${daysAhead} day${daysAhead === 1 ? '' : 's'} ahead. Last write ${formatRelative(status?.menu_dates.newest_updated_at ?? null)}.`}
        </StatCard>
        <StatCard
          title="Menus loaded today"
          health={today?.health ?? 'unknown'}
          value={today ? `${today.loaded} / ${today.expected}` : '—'}
        >
          {today && today.missing.length > 0
            ? `Missing: ${today.missing.join(', ')}`
            : 'Open locations with menus today.'}
        </StatCard>
        <StatCard
          title="Open right now"
          health={openWithoutMenu.length > 0 ? 'degraded' : 'operational'}
          value={`${openNow.length} / ${locations.length}`}
        >
          {`${forceClosed.length} force-closed.`}
        </StatCard>
      </SimpleGrid>

      <Grid gutter="md">
        <GridCol span={{ base: 12, lg: 7 }}>
          <Card withBorder radius="md" padding="lg">
            <Title order={3} fz="md" mb="sm">
              Menus by location, {formatDay(menus.today)}
            </Title>
            <TableScrollContainer minWidth={480}>
              <Table verticalSpacing={8} fz="sm">
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
                            <Badge color="red" variant="light" radius="sm">
                              Force-closed
                            </Badge>
                          ) : open ? (
                            <Badge color="teal" variant="light" radius="sm">
                              Open
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="light" radius="sm">
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
            </TableScrollContainer>

            <Stack
              gap="xs"
              mt="lg"
              pt="md"
              style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
            >
              <Group justify="space-between">
                <Text fz="sm" fw={600}>
                  Force-closed locations{' '}
                  <Text span c="dimmed" fw={500} fz="sm">
                    {forceClosed.length}
                  </Text>
                </Text>
                <Anchor href="/dashboard" fz="sm">
                  Manage locations
                </Anchor>
              </Group>
              {forceClosed.length === 0 ? (
                <Text fz="sm" c="dimmed">
                  None. Every location follows its regular hours.
                </Text>
              ) : (
                <Group gap={6}>
                  {forceClosed.map((location) => (
                    <Pill key={location.id} size="md">
                      {location.name}
                    </Pill>
                  ))}
                </Group>
              )}
            </Stack>
          </Card>
        </GridCol>

        <GridCol span={{ base: 12, lg: 5 }}>
          <Stack gap="md">
            <Section title="Services">
              <CheckRow name="Supabase" health={backend.health} detail={probeDetail(backend)} />
              <CheckRow
                name="Push function"
                health={pushFunction.health}
                detail={probeDetail(pushFunction)}
              />
              <CheckRow
                name="Website"
                health={website.health}
                detail={probeDetail(website)}
                href={WEBSITE_URL}
              />
            </Section>
            <Section title="Scheduled jobs">
              {workflows.map((run) => (
                <CheckRow
                  key={run.workflow}
                  name={run.label}
                  health={run.health}
                  detail={runDetail(run)}
                  href={run.url}
                />
              ))}
              <Text fz="xs" c="dimmed" mt="sm">
                Until staging is promoted to main, the production scraper runs on Render, and its
                logs are in the Render dashboard.
              </Text>
            </Section>
          </Stack>
        </GridCol>
      </Grid>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Section title="App and users">
          <Row label="Registered devices">{status?.devices.total.toLocaleString() ?? '—'}</Row>
          <Row label="With a push token">
            {status?.devices.with_push_token.toLocaleString() ?? '—'}
          </Row>
          <Row label="Seen in the last 30 days">
            {status?.devices.active_30_days.toLocaleString() ?? '—'}
          </Row>
          <Row label="Minimum app version">{appInfo?.app_version ?? '—'}</Row>
          <Row label="Last push sent">
            {status?.notifications.last_sent
              ? `${status.notifications.last_sent.title ?? 'Untitled'}, ${formatRelative(status.notifications.last_sent.sent_at)}`
              : 'None'}
          </Row>
          <Row label="Scheduled, not sent">
            {status
              ? `${status.notifications.pending}${status.notifications.next_scheduled_at ? `, next ${formatCentralDateTime(status.notifications.next_scheduled_at)}` : ''}`
              : '—'}
          </Row>
        </Section>

        <Section title="Data">
          <Row label="Database size">{status ? formatBytes(status.database_size_bytes) : '—'}</Row>
          <Row label="Menu dates stored">
            {status?.menu_dates.oldest && status.menu_dates.newest
              ? `${formatDay(status.menu_dates.oldest)} to ${formatDay(status.menu_dates.newest)}`
              : '—'}
          </Row>
          {coverage &&
            [
              { label: 'Missing nutrition', missing: coverage.missing_nutrition },
              { label: 'Missing ingredients', missing: coverage.missing_ingredients },
              { label: 'Missing allergens', missing: coverage.missing_allergens },
            ].map((row) => (
              <Row
                key={row.label}
                label={
                  <Group gap={8} wrap="nowrap" component="span">
                    <HealthDot health={coverageHealth(row.missing, coverage.items)} size={8} />
                    {row.label}
                  </Group>
                }
              >
                {coverage.items === 0
                  ? 'No items today'
                  : `${row.missing.toLocaleString()} of ${coverage.items.toLocaleString()} (${formatPercent(row.missing, coverage.items)})`}
              </Row>
            ))}
          {rowCounts.length > 0 && (
            <Accordion variant="unstyled" chevronPosition="left" mt={4}>
              <AccordionItem value="rows">
                <AccordionControl px={0} fz="sm" c="dimmed">
                  Row counts for {rowCounts.length} tables
                </AccordionControl>
                <AccordionPanel>
                  {rowCounts.map(([table, count]) => (
                    <Row
                      key={table}
                      label={
                        <Text span ff="monospace" fz="sm">
                          {table}
                        </Text>
                      }
                    >
                      {count.toLocaleString()}
                    </Row>
                  ))}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </Section>

        <Section title="Content">
          <Row label="Latest changelog entry">
            {changelog
              ? `${changelog.version}${changelog.is_published ? '' : ' (hidden)'}`
              : 'None'}
          </Row>
          <Row label="Last edited">{formatRelative(changelog?.updated_at ?? null)}</Row>
        </Section>
      </SimpleGrid>

      <Text fz="xs" c="dimmed">
        Not tracked yet: devices by app version, push delivery counts, app errors and Vercel
        deploys.
      </Text>
    </Stack>
  );
}
