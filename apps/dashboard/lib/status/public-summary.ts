import { createAnonClient } from '@/lib/supabase/anon';
import { formatDay } from './format';
import { type Health, worstHealth } from './menu-health';
import { getMenuStatus, type MenuStatus } from './menu-status';
import { probeSupabase, probeWebsite } from './probes';

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
  if (menus.freshness === 'outage') {
    return `Menus have not been updated past ${menus.latestMenuDate ? formatDay(menus.latestMenuDate) : 'any day'}.`;
  }
  if (!today || today.expected === 0) return 'No dining halls with menus are open today.';
  if (today.missing.length === 0) {
    return `Today's menus are posted for all ${today.expected} dining halls.`;
  }
  return `Today's menus are posted for ${today.loaded} of ${today.expected} dining halls.`;
};

export const getPublicSummary = async (): Promise<PublicSummary> => {
  const [menus, backend, website] = await Promise.all([
    getMenuStatus(createAnonClient()),
    probeSupabase(),
    probeWebsite(WEBSITE_URL),
  ]);

  const menuHealth: Health = menus.ok
    ? worstHealth([menus.freshness, menus.todayHealth?.health ?? 'unknown'])
    : backend.health === 'operational'
      ? 'unknown'
      : 'outage';

  const components: PublicComponent[] = [
    { id: 'menus', name: 'Menus', description: describeMenus(menus), health: menuHealth },
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
