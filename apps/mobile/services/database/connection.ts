import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';
import type { DrizzleDB } from './types';

export const DATABASE_NAME = 'database.db';

export const CONNECTION_PRAGMAS = 'PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;';

export const configureConnection = (database: SQLiteDatabase) =>
  database.execAsync(CONNECTION_PRAGMAS);

const writerConnection = openDatabaseSync(DATABASE_NAME);
writerConnection.execSync(CONNECTION_PRAGMAS);

export const writerDb: DrizzleDB = drizzle(writerConnection, { schema });
