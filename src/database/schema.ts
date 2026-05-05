export const DATABASE_NAME = 'check.db';

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
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  time TEXT NOT NULL,
  days_of_week TEXT,
  day_of_month INTEGER,
  notification_id TEXT,
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

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks (date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_habits_frequency ON habits (frequency);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date
  ON habit_completions (habit_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique_habit_date
  ON habit_completions (habit_id, date);
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
  frequency,
  time,
  days_of_week,
  day_of_month,
  notification_id,
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
  habits.frequency,
  habits.time,
  habits.days_of_week,
  habits.day_of_month,
  habits.notification_id,
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
  frequency,
  time,
  days_of_week,
  day_of_month,
  notification_id,
  created_at,
  updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);
`;

export const UPDATE_HABIT_SQL = `
UPDATE habits
SET
  title = ?,
  category_id = ?,
  frequency = ?,
  time = ?,
  days_of_week = ?,
  day_of_month = ?,
  updated_at = ?
WHERE id = ?;
`;

export const UPDATE_HABIT_NOTIFICATION_ID_SQL = `
UPDATE habits
SET notification_id = ?, updated_at = ?
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
WHERE date < ?;
`;

export const CLEANUP_OLD_HABIT_COMPLETIONS_SQL = `
DELETE FROM habit_completions
WHERE date < ?;
`;
