export const DATABASE_NAME = 'check.db';

export const CREATE_NOTEBOOK_ENTRIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS notebook_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL CHECK (type IN ('note', 'list', 'task')),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_NOTEBOOK_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS notebook_items (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notebook_entries (id) ON DELETE CASCADE
);
`;

export const CREATE_NOTEBOOK_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_notebook_entries_created_at
  ON notebook_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_type
  ON notebook_entries (type);
CREATE INDEX IF NOT EXISTS idx_notebook_entries_archived_updated_at
  ON notebook_entries (archived, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_items_note_position
  ON notebook_items (note_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_notebook_items_note_completed
  ON notebook_items (note_id, completed);
`;

export const CREATE_SLEEP_ENTRIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sleep_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours >= 0 AND hours <= 24),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const CREATE_SLEEP_INDEXES_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_entries_unique_date
  ON sleep_entries (date);
CREATE INDEX IF NOT EXISTS idx_sleep_entries_date
  ON sleep_entries (date);
`;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  notification_30min_id TEXT,
  notification_due_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL,
  tracking_type TEXT NOT NULL DEFAULT 'checkbox' CHECK (tracking_type IN ('checkbox', 'quantitative')),
  target_value REAL,
  target_unit TEXT,
  quick_values TEXT,
  water_reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (water_reminder_enabled IN (0, 1)),
  water_reminder_start_time TEXT DEFAULT '08:00',
  water_reminder_end_time TEXT DEFAULT '22:00',
  water_reminder_interval_minutes INTEGER NOT NULL DEFAULT 60,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time TEXT NOT NULL,
  days_of_week TEXT,
  day_of_month INTEGER,
  notification_id TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  streak_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habit_progress (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

${CREATE_NOTEBOOK_ENTRIES_TABLE_SQL}
${CREATE_NOTEBOOK_ITEMS_TABLE_SQL}
${CREATE_SLEEP_ENTRIES_TABLE_SQL}

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_habits_frequency ON habits (frequency);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON habit_completions (habit_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique_habit_date
  ON habit_completions (habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_progress_habit_date
  ON habit_progress (habit_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_progress_unique_habit_date
  ON habit_progress (habit_id, date);
${CREATE_NOTEBOOK_INDEXES_SQL}
${CREATE_SLEEP_INDEXES_SQL}
`;

export const SELECT_CATEGORIES_SQL = `
SELECT id, name, icon, color, created_at
FROM categories
ORDER BY created_at ASC, name ASC;
`;

export const SELECT_SETTINGS_SQL = `
SELECT key, value
FROM settings
ORDER BY key ASC;
`;

export const SELECT_SLEEP_ENTRY_BY_DATE_SQL = `
SELECT id, date, hours, created_at, updated_at
FROM sleep_entries
WHERE date = ?
LIMIT 1;
`;

export const SELECT_SLEEP_ENTRIES_BETWEEN_SQL = `
SELECT id, date, hours, created_at, updated_at
FROM sleep_entries
WHERE date BETWEEN ? AND ?
ORDER BY date ASC;
`;

export const UPSERT_SLEEP_ENTRY_SQL = `
INSERT INTO sleep_entries (id, date, hours, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(date) DO UPDATE SET
  hours = excluded.hours,
  updated_at = excluded.updated_at;
`;

export const SELECT_NOTEBOOK_ENTRIES_SQL = `
SELECT
  id,
  title,
  content,
  type,
  archived,
  created_at,
  updated_at
FROM notebook_entries
ORDER BY
  archived ASC,
  updated_at DESC,
  created_at DESC;
`;

export const SEARCH_NOTEBOOK_ENTRIES_SQL = `
SELECT
  id,
  title,
  content,
  type,
  archived,
  created_at,
  updated_at
FROM notebook_entries
WHERE
  archived = ?
  AND (? IS NULL OR type = ?)
  AND (
    ? = ''
    OR title LIKE ? COLLATE NOCASE
    OR COALESCE(content, '') LIKE ? COLLATE NOCASE
    OR EXISTS (
      SELECT 1
      FROM notebook_items
      WHERE
        notebook_items.note_id = notebook_entries.id
        AND notebook_items.title LIKE ? COLLATE NOCASE
    )
  )
ORDER BY updated_at DESC, created_at DESC;
`;

export const SELECT_NOTEBOOK_ENTRY_BY_ID_SQL = `
SELECT
  id,
  title,
  content,
  type,
  archived,
  created_at,
  updated_at
FROM notebook_entries
WHERE id = ?
LIMIT 1;
`;

export const INSERT_NOTEBOOK_ENTRY_SQL = `
INSERT INTO notebook_entries (
  id,
  title,
  content,
  type,
  archived,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, 0, ?, ?);
`;

export const UPDATE_NOTEBOOK_ENTRY_SQL = `
UPDATE notebook_entries
SET
  title = ?,
  content = ?,
  type = ?,
  updated_at = ?
WHERE id = ?;
`;

export const ARCHIVE_NOTEBOOK_ENTRY_SQL = `
UPDATE notebook_entries
SET
  archived = 1,
  updated_at = ?
WHERE id = ?;
`;

export const DELETE_NOTEBOOK_ENTRY_SQL = `
DELETE FROM notebook_entries
WHERE id = ?;
`;

export const SELECT_NOTEBOOK_ITEMS_SQL = `
SELECT
  id,
  note_id,
  title,
  completed,
  position,
  created_at,
  updated_at
FROM notebook_items
WHERE note_id = ?
ORDER BY position ASC, created_at ASC;
`;

export const SELECT_NOTEBOOK_ITEM_BY_ID_SQL = `
SELECT
  id,
  note_id,
  title,
  completed,
  position,
  created_at,
  updated_at
FROM notebook_items
WHERE id = ?
LIMIT 1;
`;

export const INSERT_NOTEBOOK_ITEM_SQL = `
INSERT INTO notebook_items (
  id,
  note_id,
  title,
  completed,
  position,
  created_at,
  updated_at
)
VALUES (?, ?, ?, 0, ?, ?, ?);
`;

export const UPDATE_NOTEBOOK_ITEM_SQL = `
UPDATE notebook_items
SET
  title = ?,
  position = ?,
  updated_at = ?
WHERE id = ?;
`;

export const TOUCH_NOTEBOOK_ENTRY_SQL = `
UPDATE notebook_entries
SET updated_at = ?
WHERE id = ?;
`;

export const DELETE_NOTEBOOK_ITEM_SQL = `
DELETE FROM notebook_items
WHERE id = ?;
`;

export const TOGGLE_NOTEBOOK_ITEM_COMPLETED_SQL = `
UPDATE notebook_items
SET
  completed = CASE completed WHEN 1 THEN 0 ELSE 1 END,
  updated_at = ?
WHERE id = ?;
`;

export const SELECT_TASKS_SQL = `
SELECT
  id,
  title,
  category_id,
  date,
  time,
  status,
  notification_30min_id,
  notification_due_id,
  created_at,
  updated_at
FROM tasks
ORDER BY date ASC, time ASC, created_at ASC;
`;

export const SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL = `
SELECT
  tasks.id,
  tasks.title,
  tasks.category_id,
  tasks.date,
  tasks.time,
  tasks.status,
  tasks.notification_30min_id,
  tasks.notification_due_id,
  tasks.created_at,
  tasks.updated_at,
  categories.name AS category_name,
  categories.icon AS category_icon,
  categories.color AS category_color
FROM tasks
INNER JOIN categories ON categories.id = tasks.category_id
`;

export const SELECT_TODAY_TASKS_SQL = `
${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
WHERE tasks.date = ? AND tasks.status = 'pending'
ORDER BY tasks.time ASC, tasks.created_at ASC;
`;

export const SELECT_TODAY_COMPLETED_TASKS_SQL = `
${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
WHERE tasks.date = ? AND tasks.status = 'completed'
ORDER BY tasks.updated_at DESC, tasks.time ASC, tasks.created_at ASC;
`;

export const SELECT_OLD_PENDING_TASKS_SQL = `
${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
WHERE tasks.date < ? AND tasks.status = 'pending'
ORDER BY tasks.date DESC, tasks.time ASC, tasks.created_at ASC;
`;

export const SELECT_UPCOMING_TASKS_SQL = `
${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
WHERE tasks.date >= ? AND tasks.status = 'pending'
ORDER BY tasks.date ASC, tasks.time ASC, tasks.created_at ASC;
`;

export const SELECT_TASK_BY_ID_SQL = `
${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
WHERE tasks.id = ?
LIMIT 1;
`;

export const INSERT_TASK_SQL = `
INSERT INTO tasks (
  id,
  title,
  category_id,
  date,
  time,
  status,
  notification_30min_id,
  notification_due_id,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, ?, 'pending', NULL, NULL, ?, ?);
`;

export const UPDATE_TASK_SQL = `
UPDATE tasks
SET
  title = ?,
  category_id = ?,
  date = ?,
  time = ?,
  updated_at = ?
WHERE id = ?;
`;

export const COMPLETE_TASK_SQL = `
UPDATE tasks
SET status = 'completed', updated_at = ?
WHERE id = ?;
`;

export const UPDATE_TASK_NOTIFICATION_IDS_SQL = `
UPDATE tasks
SET
  notification_30min_id = ?,
  notification_due_id = ?,
  updated_at = ?
WHERE id = ?;
`;

export const DELETE_TASK_SQL = `
DELETE FROM tasks
WHERE id = ?;
`;

export const SELECT_SETTING_VALUE_SQL = `
SELECT value
FROM settings
WHERE key = ?
LIMIT 1;
`;

export const SELECT_HABITS_SQL = `
SELECT
  id,
  title,
  category_id,
  tracking_type,
  target_value,
  target_unit,
  quick_values,
  water_reminder_enabled,
  water_reminder_start_time,
  water_reminder_end_time,
  water_reminder_interval_minutes,
  frequency,
  time,
  days_of_week,
  day_of_month,
  notification_id,
  current_streak,
  best_streak,
  streak_updated_at,
  created_at,
  updated_at
FROM habits
ORDER BY created_at ASC, title ASC;
`;

export const SELECT_HABITS_WITH_CATEGORY_FIELDS_SQL = `
SELECT
  habits.id,
  habits.title,
  habits.category_id,
  habits.tracking_type,
  habits.target_value,
  habits.target_unit,
  habits.quick_values,
  habits.water_reminder_enabled,
  habits.water_reminder_start_time,
  habits.water_reminder_end_time,
  habits.water_reminder_interval_minutes,
  habits.frequency,
  habits.time,
  habits.days_of_week,
  habits.day_of_month,
  habits.notification_id,
  habits.current_streak,
  habits.best_streak,
  habits.streak_updated_at,
  habits.created_at,
  habits.updated_at,
  categories.name AS category_name,
  categories.icon AS category_icon,
  categories.color AS category_color
FROM habits
INNER JOIN categories ON categories.id = habits.category_id
`;

export const SELECT_HABITS_WITH_CATEGORY_SQL = `
${SELECT_HABITS_WITH_CATEGORY_FIELDS_SQL}
ORDER BY habits.created_at ASC, habits.title ASC;
`;

export const SELECT_HABIT_BY_ID_SQL = `
${SELECT_HABITS_WITH_CATEGORY_FIELDS_SQL}
WHERE habits.id = ?
LIMIT 1;
`;

export const INSERT_HABIT_SQL = `
INSERT INTO habits (
  id,
  title,
  category_id,
  tracking_type,
  target_value,
  target_unit,
  quick_values,
  water_reminder_enabled,
  water_reminder_start_time,
  water_reminder_end_time,
  water_reminder_interval_minutes,
  frequency,
  time,
  days_of_week,
  day_of_month,
  notification_id,
  current_streak,
  best_streak,
  streak_updated_at,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, NULL, ?, ?);
`;

export const UPDATE_HABIT_SQL = `
UPDATE habits
SET
  title = ?,
  category_id = ?,
  tracking_type = ?,
  target_value = ?,
  target_unit = ?,
  quick_values = ?,
  water_reminder_enabled = ?,
  water_reminder_start_time = ?,
  water_reminder_end_time = ?,
  water_reminder_interval_minutes = ?,
  frequency = ?,
  time = ?,
  days_of_week = ?,
  day_of_month = ?,
  updated_at = ?
WHERE id = ?;
`;

export const UPSERT_HABIT_PROGRESS_SQL = `
INSERT INTO habit_progress (id, habit_id, date, value, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(habit_id, date) DO UPDATE SET
  value = habit_progress.value + excluded.value,
  updated_at = excluded.updated_at;
`;

export const SET_HABIT_PROGRESS_SQL = `
INSERT INTO habit_progress (id, habit_id, date, value, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(habit_id, date) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;
`;

export const SELECT_HABIT_PROGRESS_FOR_DATE_SQL = `
SELECT id, habit_id, date, value, updated_at
FROM habit_progress
WHERE date = ?;
`;

export const SELECT_HABIT_PROGRESS_FOR_HABIT_DATE_SQL = `
SELECT id, habit_id, date, value, updated_at
FROM habit_progress
WHERE habit_id = ? AND date = ?
LIMIT 1;
`;

export const UPDATE_HABIT_NOTIFICATION_ID_SQL = `
UPDATE habits
SET notification_id = ?, updated_at = ?
WHERE id = ?;
`;

export const UPDATE_HABIT_STREAK_SQL = `
UPDATE habits
SET current_streak = ?, best_streak = ?, streak_updated_at = ?
WHERE id = ?;
`;

export const DELETE_HABIT_SQL = `
DELETE FROM habits
WHERE id = ?;
`;

export const SELECT_HABIT_COMPLETION_SQL = `
SELECT id, habit_id, date, completed_at
FROM habit_completions
WHERE habit_id = ? AND date = ?
LIMIT 1;
`;

export const SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL = `
SELECT id, habit_id, date, completed_at
FROM habit_completions
WHERE date = ?;
`;

export const INSERT_HABIT_COMPLETION_SQL = `
INSERT OR IGNORE INTO habit_completions (id, habit_id, date, completed_at)
VALUES (?, ?, ?, ?);
`;

export const DELETE_HABIT_COMPLETION_SQL = `
DELETE FROM habit_completions
WHERE habit_id = ? AND date = ?;
`;

export const UPDATE_SETTING_SQL = `
INSERT INTO settings (key, value)
VALUES (?, ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
`;

export const CLEAR_ALL_NOTIFICATION_IDS_SQL = `
UPDATE tasks
SET notification_30min_id = NULL, notification_due_id = NULL;

UPDATE habits
SET notification_id = NULL;
`;

export const CLEANUP_OLD_TASKS_SQL = `
DELETE FROM tasks
WHERE date < ? AND status = 'completed';
`;

export const CLEANUP_OLD_HABIT_COMPLETIONS_SQL = `
DELETE FROM habit_completions
WHERE date < ?;
`;
