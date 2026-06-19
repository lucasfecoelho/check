import {
  addMonths,
  compareAsc,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns';

import { getTodayDateKey, parseDateKey } from './date';
import { getDatabase } from './client';
import { getHabits, getWorkoutCheckInsBetween, workoutTypeLabels } from './habits';
import { getRoutineCalendarMonth, type RoutineCalendarDay } from './calendar';
import { SELECT_SETTING_VALUE_SQL } from './schema';
import { getSleepEntriesBetween } from './sleep';
import type { SleepEntry, WorkoutCheckIn, WorkoutType } from './types';

export type RoutinePeriodSummary = {
  completedItems: number;
  expectedItems: number;
  percent: number;
};

export type RoutineWeekHabitHighlight = {
  completedCount: number;
  expectedCount: number;
  id: string;
  percent: number;
  title: string;
} | null;

export type RoutineMonthlySummary = RoutinePeriodSummary & {
  completedHabits: number;
  completedTasks: number;
  greenDays: number;
  redDays: number;
  yellowDays: number;
};

export type RoutineHabitStatistic = {
  bestStreak: number;
  categoryColor: string;
  categoryIcon: string;
  completedCount: number;
  currentStreak: number;
  expectedCount: number;
  id: string;
  percent: number;
  suggestion: string;
  title: string;
};

export type RoutineSleepSummary = {
  averageHours: number | null;
  bestNight: SleepEntry | null;
  recordedDays: number;
  worstNight: SleepEntry | null;
};

export type RoutineWorkoutSummary = {
  monthWorkoutCount: number;
  mostFrequentType: string | null;
  weekCardioMinutes: number;
  weekWorkoutMinutes: number;
};

export type RoutineStatistics = {
  habitStats: RoutineHabitStatistic[];
  month: RoutineMonthlySummary;
  sleep: {
    month: RoutineSleepSummary;
    week: RoutineSleepSummary;
  };
  sleepTrackingEnabled: boolean;
  week: RoutinePeriodSummary & {
    bestHabit: RoutineWeekHabitHighlight;
    comparisonMessage: string;
    weakHabit: RoutineWeekHabitHighlight;
  };
  workout: RoutineWorkoutSummary;
};

type SettingValueRow = {
  value: string;
};

type HabitCounter = {
  categoryColor: string;
  categoryIcon: string;
  completedCount: number;
  expectedCount: number;
  title: string;
};

function clampPercent(completed: number, expected: number) {
  if (expected <= 0) {
    return 0;
  }

  return Math.round((completed / expected) * 100);
}

function summarizeDays(days: RoutineCalendarDay[]): RoutinePeriodSummary {
  const completedItems = days.reduce((sum, day) => sum + day.completedCount, 0);
  const expectedItems = days.reduce((sum, day) => sum + day.totalCount, 0);

  return {
    completedItems,
    expectedItems,
    percent: clampPercent(completedItems, expectedItems),
  };
}

function getMonthStartsBetween(startDate: Date, endDate: Date) {
  const starts: Date[] = [];
  let cursor = startOfMonth(startDate);
  const finalMonth = startOfMonth(endDate);

  while (compareAsc(cursor, finalMonth) <= 0) {
    starts.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return starts;
}

async function getRoutineDaysForRange(startDate: Date, endDate: Date) {
  const startKey = getTodayDateKey(startDate);
  const endKey = getTodayDateKey(endDate);
  const monthStarts = getMonthStartsBetween(startDate, endDate);
  const monthDays = await Promise.all(monthStarts.map((month) => getRoutineCalendarMonth(month)));
  const byDate = new Map<string, RoutineCalendarDay>();

  monthDays.flat().forEach((day) => {
    if (day.dateKey >= startKey && day.dateKey <= endKey) {
      byDate.set(day.dateKey, day);
    }
  });

  return Array.from(byDate.values()).sort((left, right) =>
    left.dateKey.localeCompare(right.dateKey)
  );
}

function countMonthStatuses(days: RoutineCalendarDay[]) {
  return days.reduce(
    (acc, day) => {
      if (day.status === 'complete') {
        acc.greenDays += 1;
      }

      if (day.status === 'partial') {
        acc.yellowDays += 1;
      }

      if (day.status === 'missed') {
        acc.redDays += 1;
      }

      return acc;
    },
    { greenDays: 0, redDays: 0, yellowDays: 0 }
  );
}

function buildHabitCounters(days: RoutineCalendarDay[]) {
  const counters = new Map<string, HabitCounter>();

  days.forEach((day) => {
    [...day.habitsCompleted, ...day.habitsPending].forEach((habit) => {
      const current = counters.get(habit.id) ?? {
        categoryColor: habit.category_color,
        categoryIcon: habit.category_icon,
        completedCount: 0,
        expectedCount: 0,
        title: habit.title,
      };

      counters.set(habit.id, {
        ...current,
        completedCount: current.completedCount + (habit.completed ? 1 : 0),
        expectedCount: current.expectedCount + 1,
      });
    });
  });

  return counters;
}

function getHabitSuggestion(percent: number) {
  if (percent >= 80) {
    return 'Esse hábito está indo muito bem.';
  }

  if (percent > 0 && percent < 50) {
    return 'Esse hábito está ficando para trás.';
  }

  if (percent === 0) {
    return 'Esse hábito precisa de uma retomada simples.';
  }

  return 'Esse hábito está em construção.';
}

function getWeekHighlight(
  counters: Map<string, HabitCounter>,
  direction: 'best' | 'weak'
): RoutineWeekHabitHighlight {
  const rows = Array.from(counters.entries())
    .filter(([, counter]) => counter.expectedCount > 0)
    .map(([id, counter]) => ({
      completedCount: counter.completedCount,
      expectedCount: counter.expectedCount,
      id,
      percent: clampPercent(counter.completedCount, counter.expectedCount),
      title: counter.title,
    }));

  if (rows.length === 0) {
    return null;
  }

  return rows.sort((left, right) => {
    const percentDelta =
      direction === 'best' ? right.percent - left.percent : left.percent - right.percent;

    if (percentDelta !== 0) {
      return percentDelta;
    }

    return right.expectedCount - left.expectedCount;
  })[0];
}

function getWeekComparisonMessage(currentPercent: number, previousPercent: number) {
  if (currentPercent > previousPercent) {
    return 'Sua rotina melhorou em relação à semana passada.';
  }

  if (currentPercent < previousPercent) {
    return 'Esta semana caiu um pouco. Tente retomar amanhã.';
  }

  if (currentPercent === 0 && previousPercent === 0) {
    return 'Ainda há pouco histórico para comparar as semanas.';
  }

  return 'Sua rotina está estável em relação à semana passada.';
}

function summarizeSleep(entries: SleepEntry[]): RoutineSleepSummary {
  if (entries.length === 0) {
    return {
      averageHours: null,
      bestNight: null,
      recordedDays: 0,
      worstNight: null,
    };
  }

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
  const sortedByHours = [...entries].sort((left, right) => left.hours - right.hours);

  return {
    averageHours: Number((totalHours / entries.length).toFixed(1)),
    bestNight: sortedByHours[sortedByHours.length - 1],
    recordedDays: entries.length,
    worstNight: sortedByHours[0],
  };
}

function getMostFrequentWorkoutType(entries: WorkoutCheckIn[]) {
  if (entries.length === 0) {
    return null;
  }

  const counters = entries.reduce<Map<WorkoutType, number>>((acc, entry) => {
    acc.set(entry.workout_type, (acc.get(entry.workout_type) ?? 0) + 1);

    return acc;
  }, new Map());

  const [type] = Array.from(counters.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return workoutTypeLabels[left[0]].localeCompare(workoutTypeLabels[right[0]]);
  })[0];

  return workoutTypeLabels[type];
}

function summarizeWorkoutCheckIns(
  weekEntries: WorkoutCheckIn[],
  monthEntries: WorkoutCheckIn[]
): RoutineWorkoutSummary {
  return {
    monthWorkoutCount: monthEntries.length,
    mostFrequentType: getMostFrequentWorkoutType(monthEntries),
    weekCardioMinutes: weekEntries.reduce(
      (sum, entry) => sum + (entry.did_cardio ? entry.cardio_minutes ?? 0 : 0),
      0
    ),
    weekWorkoutMinutes: weekEntries.reduce((sum, entry) => sum + entry.workout_minutes, 0),
  };
}

async function getSleepTrackingEnabled() {
  const db = await getDatabase();
  const setting = await db.getFirstAsync<SettingValueRow>(SELECT_SETTING_VALUE_SQL, [
    'sleep_tracking_enabled',
  ]);

  return setting?.value !== 'false';
}

export async function getRoutineStatistics(referenceDate = new Date()): Promise<RoutineStatistics> {
  const today = parseDateKey(getTodayDateKey(referenceDate));
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = compareAsc(endOfWeek(today, { weekStartsOn: 1 }), today) === 1
    ? today
    : endOfWeek(today, { weekStartsOn: 1 });
  const previousWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const previousWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);

  const [
    weekDays,
    previousWeekDays,
    monthDays,
    habits,
    weekSleepEntries,
    monthSleepEntries,
    weekWorkoutCheckIns,
    monthWorkoutCheckIns,
    sleepTrackingEnabled,
  ] = await Promise.all([
      getRoutineDaysForRange(weekStart, weekEnd),
      getRoutineDaysForRange(previousWeekStart, previousWeekEnd),
      getRoutineDaysForRange(monthStart, today),
      getHabits(),
      getSleepEntriesBetween(getTodayDateKey(weekStart), getTodayDateKey(weekEnd)),
      getSleepEntriesBetween(getTodayDateKey(monthStart), getTodayDateKey(today)),
      getWorkoutCheckInsBetween(getTodayDateKey(weekStart), getTodayDateKey(weekEnd)),
      getWorkoutCheckInsBetween(getTodayDateKey(monthStart), getTodayDateKey(today)),
      getSleepTrackingEnabled(),
    ]);
  const weekSummary = summarizeDays(weekDays);
  const previousWeekSummary = summarizeDays(previousWeekDays);
  const monthSummary = summarizeDays(monthDays);
  const monthStatuses = countMonthStatuses(monthDays);
  const weekHabitCounters = buildHabitCounters(weekDays);
  const monthHabitCounters = buildHabitCounters(monthDays);

  const habitStats = habits
    .map<RoutineHabitStatistic>((habit) => {
      const counter = monthHabitCounters.get(habit.id);
      const completedCount = counter?.completedCount ?? 0;
      const expectedCount = counter?.expectedCount ?? 0;
      const percent = clampPercent(completedCount, expectedCount);

      return {
        bestStreak: habit.best_streak,
        categoryColor: habit.category_color,
        categoryIcon: habit.category_icon,
        completedCount,
        currentStreak: habit.current_streak,
        expectedCount,
        id: habit.id,
        percent,
        suggestion: getHabitSuggestion(percent),
        title: habit.title,
      };
    })
    .filter((habit) => habit.expectedCount > 0 || habit.completedCount > 0)
    .sort((left, right) => {
      if (right.percent !== left.percent) {
        return right.percent - left.percent;
      }

      return right.expectedCount - left.expectedCount;
    });

  return {
    habitStats,
    month: {
      ...monthSummary,
      ...monthStatuses,
      completedHabits: monthDays.reduce((sum, day) => sum + day.habitsCompleted.length, 0),
      completedTasks: monthDays.reduce((sum, day) => sum + day.tasksCompleted.length, 0),
    },
    sleep: {
      month: summarizeSleep(monthSleepEntries),
      week: summarizeSleep(weekSleepEntries),
    },
    sleepTrackingEnabled,
    week: {
      ...weekSummary,
      bestHabit: getWeekHighlight(weekHabitCounters, 'best'),
      comparisonMessage: getWeekComparisonMessage(
        weekSummary.percent,
        previousWeekSummary.percent
      ),
      weakHabit: getWeekHighlight(weekHabitCounters, 'weak'),
    },
    workout: summarizeWorkoutCheckIns(weekWorkoutCheckIns, monthWorkoutCheckIns),
  };
}
