import { eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type * as schema from '~/services/database/schema';
import { type Location, menu } from '~/services/database/schema';
import { isLocationOpen } from '~/utils/time';

export function getLocationIdsWithMenus(
  db: ExpoSQLiteDatabase<typeof schema>,
  date: string,
): Set<string> {
  const rows = db.select({ id: menu.location_id }).from(menu).where(eq(menu.date, date)).all();
  return new Set(rows.flatMap((row) => (row.id === null ? [] : [row.id])));
}

export function isLocationOpenNow(
  location: Location,
  locationIdsWithMenus: Set<string>,
  currentTime: Date,
): boolean {
  if (location.has_menus && !locationIdsWithMenus.has(location.id)) return false;
  return isLocationOpen(location, currentTime);
}
