import {
  DELETE_HABIT_COMPLETION_SQL,
  DELETE_HABIT_SQL,
  INSERT_HABIT_COMPLETION_SQL,
  INSERT_HABIT_SQL,
  SELECT_HABIT_BY_ID_SQL,
  SELECT_HABIT_COMPLETION_SQL,
  SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL,
  SELECT_HABITS_WITH_CATEGORY_SQL,
  UPDATE_HABIT_NOTIFICATION_ID_SQL,
  UPDATE_HABIT_SQL,
} from './schema';
import {
  DEFAULT_HABIT_TIME,
  getTimestamp,
  getTodayDateKey,
  isTaskTimeValid,
  normalizeTaskTime,
} from './date';
import { getDatabase } from './client';
import { createId } from './id';
import { serializeHabitWeekdays, shouldHabitAppearOnDate } from './habitRules';
import type {
  CreateHabitInput,
  HabitCompletion,
  HabitFrequency,
  HabitWithCategory,
  TodayHabit,
  UpdateHabitInput,
} from './types';

const validFrequencies: HabitFrequency[] = ['daily', 'weekly', 'monthly'];

async function getNotificationService() {
  try {
    return await import('@/services/notifications');
  } catch (error) {
    console.warn('[Check][notifications] Failed to load notification service', error);
    return null;
  }
}

function validateHabitInput(input: CreateHabitInput | UpdateHabitInput) {
  const title = input.title.trim();
  const categoryId = input.category_id.trim();
  const frequency = input.frequency;
  const time = normalizeTaskTime(input.time || DEFAULT_HABIT_TIME);
  const daysOfWeek = input.frequency === 'weekly' ? serializeHabitWeekdays(input.days_of_week) : null;
  const dayOfMonth = input.frequency === 'monthly' ? (input.day_of_month ?? null) : null;

  if (!title) {
    throw new Error('Informe um título para o hábito.');
  }

  if (!categoryId) {
    throw new Error('Escolha uma categoria.');
  }

  if (!validFrequencies.includes(frequency)) {
    throw new Error('Escolha uma frequência.');
  }

  if (!isTaskTimeValid(time)) {
    throw new Error('Use o horário no formato HH:mm.');
  }

  if (frequency === 'weekly' && !daysOfWeek) {
    throw new Error('Escolha pelo menos um dia da semana.');
  }

  if (
    frequency === 'monthly' &&
    (!Number.isInteger(dayOfMonth) || dayOfMonth === null || dayOfMonth < 1 || dayOfMonth > 31)
  ) {
    throw new Error('Escolha um dia do mês entre 1 e 31.');
  }

  return {
    categoryId,
    dayOfMonth,
    daysOfWeek,
    frequency,
    time,
    title,
  };
}

export async function createHabit(input: CreateHabitInput) {
  const data = validateHabitInput({
    ...input,
    time: normalizeTaskTime(input.time || DEFAULT_HABIT_TIME),
  });
  const db = await getDatabase();
  const id = createId('habit');
  const timestamp = getTimestamp();

  await db.runAsync(INSERT_HABIT_SQL, [
    id,
    data.title,
    data.categoryId,
    data.frequency,
    data.time,
    data.daysOfWeek,
    data.dayOfMonth,
    timestamp,
    timestamp,
  ]);

  const habit = await getHabitById(id);

  if (!habit) {
    return null;
  }

  const notificationService = await getNotificationService();
  const notificationId = notificationService
    ? await notificationService.scheduleHabitNotification(habit)
    : null;
  await db.runAsync(UPDATE_HABIT_NOTIFICATION_ID_SQL, [notificationId, getTimestamp(), id]);

  return getHabitById(id);
}

export async function updateHabit(id: string, input: UpdateHabitInput) {
  const data = validateHabitInput({
    ...input,
    time: normalizeTaskTime(input.time || DEFAULT_HABIT_TIME),
  });
  const db = await getDatabase();
  const previousHabit = await getHabitById(id);

  const notificationService = await getNotificationService();

  if (notificationService) {
    await notificationService.cancelHabitNotification(previousHabit);
  }

  await db.runAsync(UPDATE_HABIT_SQL, [
    data.title,
    data.categoryId,
    data.frequency,
    data.time,
    data.daysOfWeek,
    data.dayOfMonth,
    getTimestamp(),
    id,
  ]);

  const habit = await getHabitById(id);

  if (!habit) {
    return null;
  }

  const notificationId = notificationService
    ? await notificationService.scheduleHabitNotification(habit)
    : null;
  await db.runAsync(UPDATE_HABIT_NOTIFICATION_ID_SQL, [notificationId, getTimestamp(), id]);

  return getHabitById(id);
}

export async function deleteHabit(id: string) {
  const db = await getDatabase();
  const habit = await getHabitById(id);

  const notificationService = await getNotificationService();

  if (notificationService) {
    await notificationService.cancelHabitNotification(habit);
  }

  await db.runAsync(DELETE_HABIT_SQL, [id]);
}

export async function getHabits() {
  const db = await getDatabase();

  return db.getAllAsync<HabitWithCategory>(SELECT_HABITS_WITH_CATEGORY_SQL);
}

export async function getHabitById(id: string) {
  const db = await getDatabase();

  return db.getFirstAsync<HabitWithCategory>(SELECT_HABIT_BY_ID_SQL, [id]);
}

export async function isHabitCompletedForDate(habitId: string, dateKey: string) {
  const db = await getDatabase();
  const completion = await db.getFirstAsync<HabitCompletion>(SELECT_HABIT_COMPLETION_SQL, [
    habitId,
    dateKey,
  ]);

  return Boolean(completion);
}

export async function getTodayHabits() {
  const db = await getDatabase();
  const today = getTodayDateKey();
  const [habits, completions] = await Promise.all([
    getHabits(),
    db.getAllAsync<HabitCompletion>(SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL, [today]),
  ]);
  const completionsByHabitId = new Map(
    completions.map((completion) => [completion.habit_id, completion])
  );

  return habits
    .filter((habit) => shouldHabitAppearOnDate(habit, today))
    .map<TodayHabit>((habit) => {
      const completion = completionsByHabitId.get(habit.id);

      return {
        ...habit,
        completed_at: completion?.completed_at ?? null,
        is_completed: Boolean(completion),
      };
    })
    .sort((left, right) => {
      if (left.is_completed !== right.is_completed) {
        return left.is_completed ? 1 : -1;
      }

      return left.time.localeCompare(right.time);
    });
}

export async function completeHabitForToday(habitId: string) {
  const db = await getDatabase();
  const today = getTodayDateKey();
  const timestamp = getTimestamp();

  await db.runAsync(INSERT_HABIT_COMPLETION_SQL, [
    createId('habit-completion'),
    habitId,
    today,
    timestamp,
  ]);
}

export async function deleteHabitCompletionForToday(habitId: string) {
  const db = await getDatabase();

  await db.runAsync(DELETE_HABIT_COMPLETION_SQL, [habitId, getTodayDateKey()]);
}
