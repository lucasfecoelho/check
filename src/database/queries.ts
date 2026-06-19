import { getDatabase } from './client';
import {
  SELECT_CATEGORIES_SQL,
  SELECT_SETTINGS_SQL,
  SELECT_TASKS_SQL,
  UPDATE_SETTING_SQL,
} from './schema';
import type { Category, Setting, Task } from './types';

export async function cleanupOldTasks() {
  // Keep task history so the monthly calendar can show completed past days.
}

export async function cleanupOldHabitCompletions() {
  // Keep habit completion history for local streak calculations.
}

export async function getCategories() {
  const db = await getDatabase();

  return db.getAllAsync<Category>(SELECT_CATEGORIES_SQL);
}

export async function getSettings() {
  const db = await getDatabase();

  return db.getAllAsync<Setting>(SELECT_SETTINGS_SQL);
}

export async function updateSetting(key: string, value: string) {
  const db = await getDatabase();

  await db.runAsync(UPDATE_SETTING_SQL, [key, value]);
}

export async function getTasks() {
  const db = await getDatabase();

  return db.getAllAsync<Task>(SELECT_TASKS_SQL);
}
