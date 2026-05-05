import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from './schema';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    console.log('[Check][database] opening SQLite database');
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}
