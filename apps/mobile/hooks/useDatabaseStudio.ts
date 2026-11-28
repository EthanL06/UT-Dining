import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { useSQLiteContext } from 'expo-sqlite';

export function useDatabaseStudio() {
  useDrizzleStudio(useSQLiteContext());
}
