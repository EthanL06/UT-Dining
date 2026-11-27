import type { SupabaseClient } from '@supabase/supabase-js';
import { toCentralTime } from '@ut-dining/core';
import type { Database } from '@ut-dining/supabase';
import { formatCentralDateTime } from './format';
import {
  type DayHealth,
  getDayHealth,
  getScrapeHealth,
  type Health,
  type MenuDay,
  type ScrapeSignal,
  type StatusLocation,
} from './menu-health';

export interface MenuStatus {
  ok: boolean;
  today: string;
  latestMenuDate: string | null;
  lastMenuWrite: string | null;
  freshness: Health;
  freshnessDetail: string | null;
  todayHealth: DayHealth | null;
  history: DayHealth[];
  upcoming: DayHealth[];
  locations: StatusLocation[];
  menuDays: MenuDay[];
}

interface PublicStatusPayload {
  today: string;
  latest_menu_date: string | null;
  oldest_menu_date: string | null;
  last_menu_write?: string | null;
  days: MenuDay[];
}

export const getMenuStatus = async (
  supabase: SupabaseClient<Database>,
  scrape: ScrapeSignal | null = null,
): Promise<MenuStatus> => {
  const fallbackToday = toCentralTime().date;
  const [statusResult, locationResult] = await Promise.all([
    supabase.rpc('public_status'),
    supabase
      .from('location')
      .select('id, name, has_menus, force_close, regular_service_hours')
      .order('display_order', { ascending: true }),
  ]);

  if (statusResult.error || !statusResult.data || locationResult.error) {
    return {
      ok: false,
      today: fallbackToday,
      latestMenuDate: null,
      lastMenuWrite: null,
      freshness: 'unknown',
      freshnessDetail: null,
      todayHealth: null,
      history: [],
      upcoming: [],
      locations: [],
      menuDays: [],
    };
  }

  const payload = statusResult.data as unknown as PublicStatusPayload;
  const locations = locationResult.data as StatusLocation[];
  const lastMenuWrite = payload.last_menu_write ?? null;
  const scrapeHealth = getScrapeHealth(scrape, lastMenuWrite, Date.now(), formatCentralDateTime);
  const days = payload.days.map((day) =>
    getDayHealth(day, locations, payload.today, payload.oldest_menu_date),
  );

  return {
    ok: true,
    today: payload.today,
    latestMenuDate: payload.latest_menu_date,
    lastMenuWrite,
    freshness: scrapeHealth.health,
    freshnessDetail: scrapeHealth.detail,
    todayHealth: days.find((day) => day.date === payload.today) ?? null,
    history: days.filter((day) => day.date <= payload.today),
    upcoming: days.filter((day) => day.date > payload.today),
    locations,
    menuDays: payload.days,
  };
};
