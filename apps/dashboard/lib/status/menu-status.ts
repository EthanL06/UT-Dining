import type { SupabaseClient } from '@supabase/supabase-js';
import { toCentralTime } from '@ut-dining/core';
import type { Database } from '@ut-dining/supabase';
import {
  type DayHealth,
  getDayHealth,
  getFreshnessHealth,
  type Health,
  type MenuDay,
  type StatusLocation,
} from './menu-health';

export interface MenuStatus {
  ok: boolean;
  today: string;
  latestMenuDate: string | null;
  freshness: Health;
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
  days: MenuDay[];
}

export const getMenuStatus = async (supabase: SupabaseClient<Database>): Promise<MenuStatus> => {
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
      freshness: 'unknown',
      todayHealth: null,
      history: [],
      upcoming: [],
      locations: [],
      menuDays: [],
    };
  }

  const payload = statusResult.data as unknown as PublicStatusPayload;
  const locations = locationResult.data as StatusLocation[];
  const days = payload.days.map((day) =>
    getDayHealth(day, locations, payload.today, payload.oldest_menu_date),
  );

  return {
    ok: true,
    today: payload.today,
    latestMenuDate: payload.latest_menu_date,
    freshness: getFreshnessHealth(payload.latest_menu_date, payload.today),
    todayHealth: days.find((day) => day.date === payload.today) ?? null,
    history: days.filter((day) => day.date <= payload.today),
    upcoming: days.filter((day) => day.date > payload.today),
    locations,
    menuDays: payload.days,
  };
};
