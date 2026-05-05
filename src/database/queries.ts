import { getTodayDateKey } from './date';
import { getDatabase } from './client';
import {
  CLEANUP_OLD_HABIT_COMPLETIONS_SQL,
  CLEANUP_OLD_TASKS_SQL,
  SELECT_CATEGORIES_SQL,
  SELECT_SETTINGS_SQL,
  SELECT_TASKS_SQL,
  UPDATE_SETTING_SQL,
} from './schema';
import type { Category, Setting, Task } from './types';

export async function cleanupOldTasks() {
  const db = await getDatabase();
  const today = getTodayDateKey();

  await db.runAsync(CLEANUP_OLD_TASKS_SQL, [today]);
}

export async function cleanupOldHabitCompletions() {
  const db = await getDatabase();
  const today = getTodayDateKey();

  await db.runAsync(CLEANUP_OLD_HABIT_COMPLETIONS_SQL, [today]);
}

export async function getCategories() {
  const db = await getDatabase();

  console.log('[Check][database] loading categories');
  const categories = await db.getAllAsync<Category>(SELECT_CATEGORIES_SQL);
  console.log(`[Check][database] loaded ${categories.length} categories`);

  return categories;
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
