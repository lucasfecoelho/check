import {
  DELETE_HABIT_COMPLETION_SQL,
  DELETE_HABIT_SQL,
  INSERT_HABIT_COMPLETION_SQL,
  INSERT_HABIT_SQL,
  SELECT_HABIT_PROGRESS_FOR_DATE_SQL,
  SELECT_HABIT_PROGRESS_FOR_HABIT_DATE_SQL,
  SELECT_WORKOUT_CHECKIN_FOR_HABIT_DATE_SQL,
  SELECT_WORKOUT_CHECKINS_BETWEEN_SQL,
  SELECT_WORKOUT_CHECKINS_FOR_DATE_SQL,
  SET_HABIT_PROGRESS_SQL,
  SELECT_HABIT_BY_ID_SQL,
  SELECT_HABIT_COMPLETION_SQL,
  SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL,
  SELECT_HABITS_WITH_CATEGORY_SQL,
  UPSERT_HABIT_PROGRESS_SQL,
  UPSERT_WORKOUT_CHECKIN_SQL,
  UPDATE_HABIT_STREAK_SQL,
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
import { calculateHabitStreakSnapshot } from './habitStreaks';
import { createId } from './id';
import { LAST_DAY_OF_MONTH, serializeHabitWeekdays, shouldHabitAppearOnDate } from './habitRules';
import type {
  CreateHabitInput,
  HabitCompletion,
  HabitFrequency,
  HabitProgress,
  HabitTrackingType,
  HabitWithCategory,
  SaveWorkoutCheckInInput,
  TodayHabit,
  UpdateHabitInput,
  WorkoutCheckIn,
  WorkoutType,
} from './types';

const validFrequencies: HabitFrequency[] = ['daily', 'weekly', 'monthly'];
const validTrackingTypes: HabitTrackingType[] = ['checkbox', 'quantitative'];
const validWorkoutTypes: WorkoutType[] = [
  'chest_triceps',
  'back_biceps',
  'legs',
  'shoulders',
  'full_body',
  'cardio',
  'other',
];
const DEFAULT_WATER_REMINDER_START_TIME = '08:00';
const DEFAULT_WATER_REMINDER_END_TIME = '22:00';
const WATER_REMINDER_INTERVAL_MINUTES = 60;

export const workoutTypeLabels: Record<WorkoutType, string> = {
  back_biceps: 'Costas/bíceps',
  cardio: 'Cardio',
  chest_triceps: 'Peito/tríceps',
  full_body: 'Full body',
  legs: 'Pernas',
  other: 'Outro',
  shoulders: 'Ombro',
};

type HabitCompletionStreakRow = Pick<HabitCompletion, 'date' | 'habit_id'>;

function normalizeSearchText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isWorkoutHabit(
  habit: Pick<HabitWithCategory, 'category_name' | 'title'>
) {
  const searchable = `${normalizeSearchText(habit.title)} ${normalizeSearchText(
    habit.category_name
  )}`;

  return [
    'academia',
    'treino',
    'musculacao',
    'workout',
    'gym',
  ].some((term) => searchable.includes(term));
}

export function formatWorkoutCheckInSummary(checkIn: WorkoutCheckIn) {
  const parts = [
    workoutTypeLabels[checkIn.workout_type],
    `${checkIn.workout_minutes} min`,
  ];

  if (checkIn.did_cardio && checkIn.cardio_minutes) {
    parts.push(`Cardio ${checkIn.cardio_minutes} min`);
  }

  return parts.join(' • ');
}

function validateWorkoutCheckInInput(input: SaveWorkoutCheckInInput) {
  const workoutMinutes = Number(input.workout_minutes);
  const didCardio = Boolean(input.did_cardio);
  const parsedCardioMinutes = Number(input.cardio_minutes ?? 0);
  const cardioMinutes = didCardio ? parsedCardioMinutes : null;
  const note = input.note?.trim() || null;

  if (!input.habit_id.trim()) {
    throw new Error('Hábito inválido.');
  }

  if (!validWorkoutTypes.includes(input.workout_type)) {
    throw new Error('Escolha o tipo de treino.');
  }

  if (!Number.isInteger(workoutMinutes) || workoutMinutes <= 0) {
    throw new Error('Informe o tempo total em minutos.');
  }

  if (didCardio && (!Number.isInteger(parsedCardioMinutes) || parsedCardioMinutes <= 0)) {
    throw new Error('Informe o tempo de cardio em minutos.');
  }

  return {
    cardioMinutes,
    didCardio,
    habitId: input.habit_id.trim(),
    note,
    workoutMinutes,
    workoutType: input.workout_type,
  };
}

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
  const trackingType = input.tracking_type ?? 'checkbox';
  const time = normalizeTaskTime(input.time || DEFAULT_HABIT_TIME);
  const daysOfWeek = input.frequency === 'weekly' ? serializeHabitWeekdays(input.days_of_week) : null;
  const dayOfMonth = input.frequency === 'monthly' ? (input.day_of_month ?? null) : null;
  const targetValue = trackingType === 'quantitative' ? Number(input.target_value) : null;
  const targetUnit = trackingType === 'quantitative' ? input.target_unit?.trim() || null : null;
  const quickValues =
    trackingType === 'quantitative'
      ? JSON.stringify(
          (input.quick_values ?? [])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        )
      : null;
  const waterReminderEnabled =
    trackingType === 'quantitative' && Boolean(input.water_reminder_enabled);
  const waterReminderStartTime = waterReminderEnabled
    ? normalizeTaskTime(input.water_reminder_start_time || DEFAULT_WATER_REMINDER_START_TIME)
    : DEFAULT_WATER_REMINDER_START_TIME;
  const waterReminderEndTime = waterReminderEnabled
    ? normalizeTaskTime(input.water_reminder_end_time || DEFAULT_WATER_REMINDER_END_TIME)
    : DEFAULT_WATER_REMINDER_END_TIME;

  if (!title) {
    throw new Error('Informe um título para o hábito.');
  }

  if (!categoryId) {
    throw new Error('Escolha uma categoria.');
  }

  if (!validFrequencies.includes(frequency)) {
    throw new Error('Escolha uma frequência.');
  }

  if (!validTrackingTypes.includes(trackingType)) {
    throw new Error('Escolha um tipo de hábito.');
  }

  if (trackingType === 'quantitative') {
    if (!Number.isFinite(targetValue) || targetValue === null || targetValue <= 0) {
      throw new Error('Informe uma meta maior que zero.');
    }

    if (!targetUnit) {
      throw new Error('Informe uma unidade para a meta.');
    }
  }

  if (waterReminderEnabled) {
    if (!isTaskTimeValid(waterReminderStartTime) || !isTaskTimeValid(waterReminderEndTime)) {
      throw new Error('Use horários de lembrete no formato HH:mm.');
    }

    if (waterReminderStartTime >= waterReminderEndTime) {
      throw new Error('O horário final precisa ser depois do início.');
    }
  }

  if (!isTaskTimeValid(time)) {
    throw new Error('Use o horário no formato HH:mm.');
  }

  if (frequency === 'weekly' && !daysOfWeek) {
    throw new Error('Escolha pelo menos um dia da semana.');
  }

  if (
    frequency === 'monthly' &&
    (
      !Number.isInteger(dayOfMonth) ||
      dayOfMonth === null ||
      (dayOfMonth !== LAST_DAY_OF_MONTH && (dayOfMonth < 1 || dayOfMonth > 31))
    )
  ) {
    throw new Error('Escolha um dia do mês entre 1 e 31 ou o último dia do mês.');
  }

  return {
    categoryId,
    dayOfMonth,
    daysOfWeek,
    frequency,
    quickValues,
    targetUnit,
    targetValue,
    time,
    title,
    trackingType,
    waterReminderEnabled,
    waterReminderEndTime,
    waterReminderIntervalMinutes: WATER_REMINDER_INTERVAL_MINUTES,
    waterReminderStartTime,
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
    data.trackingType,
    data.targetValue,
    data.targetUnit,
    data.quickValues,
    data.waterReminderEnabled ? 1 : 0,
    data.waterReminderStartTime,
    data.waterReminderEndTime,
    data.waterReminderIntervalMinutes,
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
    data.trackingType,
    data.targetValue,
    data.targetUnit,
    data.quickValues,
    data.waterReminderEnabled ? 1 : 0,
    data.waterReminderStartTime,
    data.waterReminderEndTime,
    data.waterReminderIntervalMinutes,
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
  const habits = await db.getAllAsync<HabitWithCategory>(SELECT_HABITS_WITH_CATEGORY_SQL);

  return refreshHabitStreaks(habits);
}

export async function getHabitById(id: string) {
  const habit = await getHabitByIdRaw(id);

  if (!habit) {
    return null;
  }

  return refreshHabitStreak(habit);
}

async function getHabitByIdRaw(id: string) {
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
  const [habits, completions, progressRows, workoutCheckIns] = await Promise.all([
    getHabits(),
    db.getAllAsync<HabitCompletion>(SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL, [today]),
    db.getAllAsync<HabitProgress>(SELECT_HABIT_PROGRESS_FOR_DATE_SQL, [today]),
    db.getAllAsync<WorkoutCheckIn>(SELECT_WORKOUT_CHECKINS_FOR_DATE_SQL, [today]),
  ]);
  const completionsByHabitId = new Map(
    completions.map((completion) => [completion.habit_id, completion])
  );
  const progressByHabitId = new Map(
    progressRows.map((progress) => [progress.habit_id, progress])
  );
  const workoutCheckInsByHabitId = new Map(
    workoutCheckIns.map((checkIn) => [checkIn.habit_id, checkIn])
  );
  const todayHabits = habits.filter((habit) => shouldHabitAppearOnDate(habit, today));

  return todayHabits
    .map<TodayHabit>((habit) => {
      const completion = completionsByHabitId.get(habit.id);
      const progressValue = progressByHabitId.get(habit.id)?.value ?? 0;
      const reachedTarget =
        habit.tracking_type === 'quantitative' &&
        typeof habit.target_value === 'number' &&
        progressValue >= habit.target_value;

      return {
        ...habit,
        completed_at: completion?.completed_at ?? null,
        progress_value: progressValue,
        is_completed: Boolean(completion) || reachedTarget,
        workout_checkin_summary: workoutCheckInsByHabitId.has(habit.id)
          ? formatWorkoutCheckInSummary(workoutCheckInsByHabitId.get(habit.id)!)
          : null,
      };
    })
    .sort((left, right) => {
      if (left.is_completed !== right.is_completed) {
        return left.is_completed ? 1 : -1;
      }

      return left.time.localeCompare(right.time);
    });
}

async function refreshHabitStreaks(habits: HabitWithCategory[]) {
  if (habits.length === 0) {
    return habits;
  }

  const completionsByHabitId = await getHabitCompletionDatesByHabitId(
    habits.map((habit) => habit.id)
  );

  return Promise.all(
    habits.map((habit) =>
      refreshHabitStreak(habit, completionsByHabitId.get(habit.id) ?? new Set())
    )
  );
}

async function refreshHabitStreak(
  habit: HabitWithCategory,
  completionDates?: Set<string>
): Promise<HabitWithCategory> {
  const dates = completionDates ?? (await getHabitCompletionDates(habit.id));
  const snapshot = calculateHabitStreakSnapshot(habit, dates);
  const bestStreak = snapshot.bestStreak;
  const streakChanged =
    habit.current_streak !== snapshot.currentStreak || habit.best_streak !== bestStreak;

  if (streakChanged) {
    const db = await getDatabase();
    const timestamp = getTimestamp();

    await db.runAsync(UPDATE_HABIT_STREAK_SQL, [
      snapshot.currentStreak,
      bestStreak,
      timestamp,
      habit.id,
    ]);

    return {
      ...habit,
      best_streak: bestStreak,
      consistency_label: snapshot.consistencyLabel,
      current_streak: snapshot.currentStreak,
      streak_updated_at: timestamp,
    };
  }

  return {
    ...habit,
    best_streak: bestStreak,
    consistency_label: snapshot.consistencyLabel,
    current_streak: snapshot.currentStreak,
    streak_updated_at: habit.streak_updated_at,
  };
}

async function refreshHabitStreakById(habitId: string) {
  const habit = await getHabitByIdRaw(habitId);

  if (habit) {
    await refreshHabitStreak(habit);
  }
}

async function rescheduleHabitNotification(habitId: string) {
  const notificationService = await getNotificationService();

  if (!notificationService) {
    return;
  }

  const db = await getDatabase();
  const habit = await getHabitById(habitId);

  await notificationService.cancelHabitNotification(habit);
  const notificationId = habit ? await notificationService.scheduleHabitNotification(habit) : null;
  await db.runAsync(UPDATE_HABIT_NOTIFICATION_ID_SQL, [notificationId, getTimestamp(), habitId]);
}

async function insertHabitCompletionForToday(db: Awaited<ReturnType<typeof getDatabase>>, habitId: string) {
  await db.runAsync(INSERT_HABIT_COMPLETION_SQL, [
    createId('habit-completion'),
    habitId,
    getTodayDateKey(),
    getTimestamp(),
  ]);
}

async function getHabitProgressForToday(habitId: string) {
  const db = await getDatabase();

  return db.getFirstAsync<HabitProgress>(SELECT_HABIT_PROGRESS_FOR_HABIT_DATE_SQL, [
    habitId,
    getTodayDateKey(),
  ]);
}

async function getHabitCompletionDates(habitId: string) {
  const completionsByHabitId = await getHabitCompletionDatesByHabitId([habitId]);

  return completionsByHabitId.get(habitId) ?? new Set<string>();
}

async function getHabitCompletionDatesByHabitId(habitIds: string[]) {
  if (habitIds.length === 0) {
    return new Map<string, Set<string>>();
  }

  const db = await getDatabase();
  const placeholders = habitIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<HabitCompletionStreakRow>(
    `
    SELECT habit_id, date
    FROM habit_completions
    WHERE habit_id IN (${placeholders})
    ORDER BY date DESC;
    `,
    habitIds
  );

  return rows.reduce<Map<string, Set<string>>>((acc, row) => {
    const dates = acc.get(row.habit_id) ?? new Set<string>();
    dates.add(row.date);
    acc.set(row.habit_id, dates);

    return acc;
  }, new Map());
}

export async function completeHabitForToday(habitId: string) {
  const db = await getDatabase();
  const habit = await getHabitById(habitId);

  if (habit?.tracking_type === 'quantitative' && habit.target_value) {
    await db.runAsync(SET_HABIT_PROGRESS_SQL, [
      createId('habit-progress'),
      habitId,
      getTodayDateKey(),
      habit.target_value,
      getTimestamp(),
    ]);
  }

  await insertHabitCompletionForToday(db, habitId);
  await refreshHabitStreakById(habitId);
  await rescheduleHabitNotification(habitId);
}

export async function getWorkoutCheckInForToday(habitId: string) {
  const db = await getDatabase();

  return db.getFirstAsync<WorkoutCheckIn>(SELECT_WORKOUT_CHECKIN_FOR_HABIT_DATE_SQL, [
    habitId,
    getTodayDateKey(),
  ]);
}

export async function getWorkoutCheckInsBetween(startDate: string, endDate: string) {
  const db = await getDatabase();

  return db.getAllAsync<WorkoutCheckIn>(SELECT_WORKOUT_CHECKINS_BETWEEN_SQL, [
    startDate,
    endDate,
  ]);
}

export async function saveWorkoutCheckInForToday(input: SaveWorkoutCheckInInput) {
  const data = validateWorkoutCheckInInput(input);
  const db = await getDatabase();
  const habit = await getHabitById(data.habitId);

  if (!habit || !isWorkoutHabit(habit)) {
    throw new Error('Este hábito não possui check-in de academia.');
  }

  const timestamp = getTimestamp();
  const today = getTodayDateKey();

  await db.runAsync(UPSERT_WORKOUT_CHECKIN_SQL, [
    createId('workout-checkin'),
    data.habitId,
    today,
    data.workoutType,
    data.workoutMinutes,
    data.didCardio ? 1 : 0,
    data.cardioMinutes,
    data.note,
    timestamp,
    timestamp,
  ]);

  await insertHabitCompletionForToday(db, data.habitId);
  await refreshHabitStreakById(data.habitId);
  await rescheduleHabitNotification(data.habitId);
}

export async function deleteHabitCompletionForToday(habitId: string) {
  const db = await getDatabase();
  const habit = await getHabitById(habitId);

  await db.runAsync(DELETE_HABIT_COMPLETION_SQL, [habitId, getTodayDateKey()]);
  if (habit?.tracking_type === 'quantitative') {
    await db.runAsync(SET_HABIT_PROGRESS_SQL, [
      createId('habit-progress'),
      habitId,
      getTodayDateKey(),
      0,
      getTimestamp(),
    ]);
  }
  await refreshHabitStreakById(habitId);
  await rescheduleHabitNotification(habitId);
}

export async function addHabitProgressForToday(habitId: string, amount: number) {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }

  const db = await getDatabase();
  const habit = await getHabitById(habitId);

  if (!habit || habit.tracking_type !== 'quantitative' || !habit.target_value) {
    throw new Error('Este hábito não possui meta quantitativa.');
  }

  await db.runAsync(UPSERT_HABIT_PROGRESS_SQL, [
    createId('habit-progress'),
    habitId,
    getTodayDateKey(),
    normalizedAmount,
    getTimestamp(),
  ]);

  const progress = await getHabitProgressForToday(habitId);

  if ((progress?.value ?? 0) >= habit.target_value) {
    await insertHabitCompletionForToday(db, habitId);
    await refreshHabitStreakById(habitId);
  }

  await rescheduleHabitNotification(habitId);
}
