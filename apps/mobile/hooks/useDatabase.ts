import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { DrizzleDB } from '../services/database/database';
import * as schema from '../services/database/schema';

export function useDatabase(): DrizzleDB {
  const db = useSQLiteContext();
  return useMemo(() => drizzle(db, { schema }), [db]);
}
