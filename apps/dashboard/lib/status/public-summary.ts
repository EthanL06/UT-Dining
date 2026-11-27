import { createAnonClient } from '@/lib/supabase/anon';
import type { Health } from './menu-health';
import { worstHealth } from './menu-health';
import { getMenuStatus, type MenuStatus } from './menu-status';
import { probeSupabase, probeWebsite } from './probes';
import { getLatestWorkflowRun, SCRAPER_WORKFLOW } from './workflows';

const WEBSITE_URL = process.env.STATUS_WEBSITE_URL ?? 'https://utdining.app';

export const STATUS_LABEL: Record<Health, string> = {
  operational: 'Operational',
  degraded: 'Partly working',
  outage: 'Down',
  unknown: 'No data',
};

export interface PublicComponent {
  id: 'menus' | 'app' | 'website';
  name: string;
  description: string;
  note?: string | null;
  health: Health;
}

export interface PublicSummary {
  overall: Health;
  components: PublicComponent[];
  menus: MenuStatus;
  checkedAt: string;
}

const describeMenus = (menus: MenuStatus) => {
  const today = menus.todayHealth;
  if (!menus.ok) return 'Menu data could not be checked.';
  if (menus.freshnessDetail) return menus.freshnessDetail;
  if (!today || today.expected === 0) return 'No dining halls with menus are open today.';
  if (today.complete) return `Today's menus are posted for all ${today.expected} dining halls.`;
  if (today.loaded === 0) return "Menus are up to date. UT hasn't posted any menus for today.";
  return `Menus are up to date. UT has posted today's menus for ${today.loaded} of ${today.expected} dining halls.`;
};

export const notPostedNote = (missing: string[]) =>
  missing.length === 0
    ? null
    : `UT hasn't posted a menu for ${missing.join(', ')}. That usually means it's closed, like on a holiday or break, not a problem with UT Dining.`;

export const getPublicSummary = async (): Promise<PublicSummary> => {
  const scraper = await getLatestWorkflowRun(SCRAPER_WORKFLOW, 'Scraper');
  const [menus, backend, website] = await Promise.all([
    getMenuStatus(createAnonClient(), scraper.startedAt ? scraper : null),
    probeSupabase(),
    probeWebsite(WEBSITE_URL),
  ]);

  const menuHealth: Health = menus.ok
    ? menus.freshness
    : backend.health === 'operational'
      ? 'unknown'
      : 'outage';

  const components: PublicComponent[] = [
    {
      id: 'menus',
      name: 'Menus',
      description: describeMenus(menus),
      note:
        menus.ok && !menus.freshnessDetail ? notPostedNote(menus.todayHealth?.missing ?? []) : null,
      health: menuHealth,
    },
    {
      id: 'app',
      name: 'App service',
      description:
        backend.health === 'operational'
          ? 'The app can load menus, hours and favorites.'
          : 'The app may not load new menus or hours.',
      health: backend.health,
    },
    {
      id: 'website',
      name: 'Website',
      description:
        website.health === 'operational'
          ? 'utdining.app is up.'
          : 'utdining.app is not responding.',
      health: website.health,
    },
  ];

  return {
    overall: worstHealth(components.map((component) => component.health)),
    components,
    menus,
    checkedAt: new Date().toISOString(),
  };
};
