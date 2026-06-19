import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CREATE_NOTEBOOK_ENTRIES_TABLE_SQL,
  CREATE_NOTEBOOK_ITEMS_TABLE_SQL,
  CREATE_SLEEP_ENTRIES_TABLE_SQL,
  CREATE_SLEEP_INDEXES_SQL,
  CREATE_WORKOUT_CHECKINS_INDEXES_SQL,
  CREATE_WORKOUT_CHECKINS_TABLE_SQL,
} from './schema';

type TableInfoRow = {
  name: string;
  notnull: number;
};

type SqliteMasterRow = {
  name: string;
};

async function tableExists(db: SQLiteDatabase, tableName: string) {
  const table = await db.getFirstAsync<SqliteMasterRow>(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
    LIMIT 1;
    `,
    [tableName]
  );

  return Boolean(table);
}

async function getTableColumns(db: SQLiteDatabase, tableName: string) {
  return db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName});`);
}

function buildNotebookEntryContentExpression(columns: TableInfoRow[]) {
  const hasContent = columns.some((column) => column.name === 'content');

  return hasContent ? 'content' : 'NULL';
}

function buildNotebookEntryArchivedExpression(columns: TableInfoRow[]) {
  if (columns.some((column) => column.name === 'archived')) {
    return 'archived';
  }

  if (columns.some((column) => column.name === 'status')) {
    return `CASE WHEN status = 'archived' THEN 1 ELSE 0 END`;
  }

  return '0';
}

function notebookEntriesNeedMigration(columns: TableInfoRow[]) {
  const columnNames = new Set(columns.map((column) => column.name));
  const archivedColumn = columns.find((column) => column.name === 'archived');
  const contentColumn = columns.find((column) => column.name === 'content');
  const hasLegacyStatusColumn = columns.some((column) => column.name === 'status');
  const requiredColumns = ['id', 'title', 'content', 'type', 'archived', 'created_at', 'updated_at'];

  return (
    requiredColumns.some((columnName) => !columnNames.has(columnName)) ||
    !archivedColumn ||
    hasLegacyStatusColumn ||
    contentColumn?.notnull === 1
  );
}

export async function migrateDatabase(db: SQLiteDatabase) {
  await migrateHabitStreakColumns(db);
  await migrateHabitQuantitativeFields(db);
  await migrateHabitWaterReminderFields(db);
  await migrateHabitProgressTable(db);
  await migrateSleepEntries(db);
  await migrateWorkoutCheckIns(db);
  await migrateNotebookEntries(db);
}

async function migrateHabitStreakColumns(db: SQLiteDatabase) {
  if (!(await tableExists(db, 'habits'))) {
    return;
  }

  const columns = await getTableColumns(db, 'habits');
  const columnNames = new Set(columns.map((column) => column.name));
  const statements: string[] = [];

  if (!columnNames.has('current_streak')) {
    statements.push('ALTER TABLE habits ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;');
  }

  if (!columnNames.has('best_streak')) {
    statements.push('ALTER TABLE habits ADD COLUMN best_streak INTEGER NOT NULL DEFAULT 0;');
  }

  if (!columnNames.has('streak_updated_at')) {
    statements.push('ALTER TABLE habits ADD COLUMN streak_updated_at TEXT;');
  }

  if (statements.length > 0) {
    await db.execAsync(statements.join('\n'));
  }
}

async function migrateHabitQuantitativeFields(db: SQLiteDatabase) {
  if (!(await tableExists(db, 'habits'))) {
    return;
  }

  const columns = await getTableColumns(db, 'habits');
  const columnNames = new Set(columns.map((column) => column.name));
  const statements: string[] = [];

  if (!columnNames.has('tracking_type')) {
    statements.push(
      "ALTER TABLE habits ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'checkbox' CHECK (tracking_type IN ('checkbox', 'quantitative'));"
    );
  }

  if (!columnNames.has('target_value')) {
    statements.push('ALTER TABLE habits ADD COLUMN target_value REAL;');
  }

  if (!columnNames.has('target_unit')) {
    statements.push('ALTER TABLE habits ADD COLUMN target_unit TEXT;');
  }

  if (!columnNames.has('quick_values')) {
    statements.push('ALTER TABLE habits ADD COLUMN quick_values TEXT;');
  }

  if (statements.length > 0) {
    await db.execAsync(statements.join('\n'));
  }
}

async function migrateHabitWaterReminderFields(db: SQLiteDatabase) {
  if (!(await tableExists(db, 'habits'))) {
    return;
  }

  const columns = await getTableColumns(db, 'habits');
  const columnNames = new Set(columns.map((column) => column.name));
  const statements: string[] = [];

  if (!columnNames.has('water_reminder_enabled')) {
    statements.push(
      'ALTER TABLE habits ADD COLUMN water_reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (water_reminder_enabled IN (0, 1));'
    );
  }

  if (!columnNames.has('water_reminder_start_time')) {
    statements.push("ALTER TABLE habits ADD COLUMN water_reminder_start_time TEXT DEFAULT '08:00';");
  }

  if (!columnNames.has('water_reminder_end_time')) {
    statements.push("ALTER TABLE habits ADD COLUMN water_reminder_end_time TEXT DEFAULT '22:00';");
  }

  if (!columnNames.has('water_reminder_interval_minutes')) {
    statements.push(
      'ALTER TABLE habits ADD COLUMN water_reminder_interval_minutes INTEGER NOT NULL DEFAULT 60;'
    );
  }

  if (statements.length > 0) {
    await db.execAsync(statements.join('\n'));
  }
}

async function migrateHabitProgressTable(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS habit_progress (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_habit_progress_habit_date
      ON habit_progress (habit_id, date);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_progress_unique_habit_date
      ON habit_progress (habit_id, date);
  `);
}

async function migrateSleepEntries(db: SQLiteDatabase) {
  await db.execAsync(`
    ${CREATE_SLEEP_ENTRIES_TABLE_SQL}
    ${CREATE_SLEEP_INDEXES_SQL}
  `);
}

async function migrateWorkoutCheckIns(db: SQLiteDatabase) {
  await db.execAsync(`
    ${CREATE_WORKOUT_CHECKINS_TABLE_SQL}
    ${CREATE_WORKOUT_CHECKINS_INDEXES_SQL}
  `);
}

async function migrateNotebookEntries(db: SQLiteDatabase) {
  if (!(await tableExists(db, 'notebook_entries'))) {
    return;
  }

  const entryColumns = await getTableColumns(db, 'notebook_entries');

  if (!notebookEntriesNeedMigration(entryColumns)) {
    return;
  }

  const hasNotebookItems = await tableExists(db, 'notebook_items');
  const contentExpression = buildNotebookEntryContentExpression(entryColumns);
  const archivedExpression = buildNotebookEntryArchivedExpression(entryColumns);

  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;

    ${hasNotebookItems ? 'ALTER TABLE notebook_items RENAME TO notebook_items_legacy;' : ''}
    ALTER TABLE notebook_entries RENAME TO notebook_entries_legacy;

    ${CREATE_NOTEBOOK_ENTRIES_TABLE_SQL}
    ${CREATE_NOTEBOOK_ITEMS_TABLE_SQL}

    INSERT INTO notebook_entries (
      id,
      title,
      content,
      type,
      archived,
      created_at,
      updated_at
    )
    SELECT
      id,
      title,
      ${contentExpression},
      type,
      ${archivedExpression},
      created_at,
      updated_at
    FROM notebook_entries_legacy;

    ${
      hasNotebookItems
        ? `
          INSERT INTO notebook_items (
            id,
            note_id,
            title,
            completed,
            position,
            created_at,
            updated_at
          )
          SELECT
            id,
            note_id,
            title,
            completed,
            position,
            created_at,
            updated_at
          FROM notebook_items_legacy;

          DROP TABLE notebook_items_legacy;
        `
        : ''
    }

    DROP TABLE notebook_entries_legacy;

    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}
