import { getDatabase } from './client';
import { cleanupOldHabitCompletions, cleanupOldTasks } from './queries';
import { SCHEMA_SQL } from './schema';
import { seedDefaultCategories, seedDefaultSettings } from './seeds';

let initDatabasePromise: Promise<void> | null = null;

export async function initDatabase() {
  if (!initDatabasePromise) {
    initDatabasePromise = (async () => {
      console.log('[Check][database] init start');
      const db = await getDatabase();

      console.log('[Check][database] applying schema');
      await db.execAsync(SCHEMA_SQL);
      console.log('[Check][database] seeding default categories');
      await seedDefaultCategories(db);
      console.log('[Check][database] seeding default settings');
      await seedDefaultSettings(db);
      console.log('[Check][database] cleaning old tasks');
      await cleanupOldTasks();
      console.log('[Check][database] cleaning old habit completions');
      await cleanupOldHabitCompletions();
      console.log('[Check][database] init done');
    })();

    initDatabasePromise.catch((error) => {
      console.error('[Check][database] init failed', error);
      initDatabasePromise = null;
    });
  }

  return initDatabasePromise;
}

export { getDatabase } from './client';
export {
  cleanupOldHabitCompletions,
  cleanupOldTasks,
  getCategories,
  getSettings,
  getTasks,
  updateSetting,
} from './queries';
export { seedDefaultCategories, seedDefaultSettings } from './seeds';
export {
  completeHabitForToday,
  createHabit,
  deleteHabit,
  deleteHabitCompletionForToday,
  getHabitById,
  getHabits,
  getTodayHabits,
  isHabitCompletedForDate,
  updateHabit,
} from './habits';
export {
  completeTask,
  createTask,
  deleteTask,
  getTaskById,
  getTodayTasks,
  getUpcomingTasks,
  updateTask,
} from './tasks';
export type {
  Category,
  CreateHabitInput,
  CreateTaskInput,
  Habit,
  HabitCompletion,
  HabitFrequency,
  HabitWithCategory,
  Setting,
  Task,
  TaskStatus,
  TaskWithCategory,
  TodayHabit,
  UpdateHabitInput,
  UpdateTaskInput,
} from './types';
