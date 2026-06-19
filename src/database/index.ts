import { getDatabase } from './client';
import { migrateDatabase } from './migrations';
import { cleanupOldHabitCompletions, cleanupOldTasks } from './queries';
import { SCHEMA_SQL } from './schema';
import { seedDefaultCategories, seedDefaultSettings } from './seeds';

let initDatabasePromise: Promise<void> | null = null;

export async function initDatabase() {
  if (!initDatabasePromise) {
    initDatabasePromise = (async () => {
      const db = await getDatabase();

      await migrateDatabase(db);
      await db.execAsync(SCHEMA_SQL);
      await seedDefaultCategories(db);
      await seedDefaultSettings(db);
      await cleanupOldTasks();
      await cleanupOldHabitCompletions();
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
  addHabitProgressForToday,
  completeHabitForToday,
  createHabit,
  deleteHabit,
  deleteHabitCompletionForToday,
  formatWorkoutCheckInSummary,
  getHabitById,
  getHabits,
  getTodayHabits,
  getWorkoutCheckInForToday,
  getWorkoutCheckInsBetween,
  isHabitCompletedForDate,
  isWorkoutHabit,
  saveWorkoutCheckInForToday,
  updateHabit,
  workoutTypeLabels,
} from './habits';
export {
  completeTask,
  createTask,
  deleteTask,
  getOldPendingTasks,
  getTaskById,
  getTodayCompletedTasks,
  getTodayTasks,
  getUpcomingTasks,
  updateTask,
} from './tasks';
export {
  getSleepEntriesBetween,
  getSleepEntryByDate,
  getTodaySleepEntry,
  saveSleepEntry,
} from './sleep';
export {
  getRoutineCalendarMonth,
  type RoutineCalendarDay,
  type RoutineCalendarDayStatus,
  type RoutineCalendarItem,
} from './calendar';
export {
  getRoutineStatistics,
  type RoutineHabitStatistic,
  type RoutineMonthlySummary,
  type RoutinePeriodSummary,
  type RoutineSleepSummary,
  type RoutineStatistics,
  type RoutineWeekHabitHighlight,
  type RoutineWorkoutSummary,
} from './statistics';
export {
  archiveNotebookEntry,
  createNotebookEntry,
  createNotebookItem,
  deleteNotebookEntry,
  deleteNotebookItem,
  getNotebookEntries,
  getNotebookEntryById,
  getNotebookItems,
  searchNotebookEntries,
  syncNotebookItems,
  toggleNotebookItemCompleted,
  updateNotebookEntry,
  updateNotebookItem,
} from './notebook';
export type {
  Category,
  CreateNotebookEntryInput,
  CreateNotebookItemInput,
  CreateHabitInput,
  CreateTaskInput,
  Habit,
  HabitCompletion,
  HabitFrequency,
  HabitProgress,
  HabitTrackingType,
  HabitWithCategory,
  NotebookEntry,
  NotebookEntryFilter,
  NotebookEntryType,
  NotebookItem,
  Setting,
  SaveWorkoutCheckInInput,
  SaveSleepEntryInput,
  SleepEntry,
  SyncNotebookItemInput,
  Task,
  TaskStatus,
  TaskWithCategory,
  TodayHabit,
  UpdateNotebookEntryInput,
  UpdateNotebookItemInput,
  UpdateHabitInput,
  UpdateTaskInput,
  WorkoutCheckIn,
  WorkoutType,
} from './types';
