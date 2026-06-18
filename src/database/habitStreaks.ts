import { addDays, getDay, isAfter, subDays } from 'date-fns';

import { getTodayDateKey, parseDateKey } from './date';
import { shouldHabitAppearOnDate } from './habitRules';
import type { Habit } from './types';

const STREAK_LOOKBACK_DAYS = 730;
const CONSISTENCY_LOOKBACK_DAYS = 30;

export type HabitStreakSnapshot = {
  bestStreak: number;
  consistencyLabel: string;
  currentStreak: number;
};

function isWeekendDate(date: Date) {
  const day = getDay(date);

  return day === 0 || day === 6;
}

function isRequiredForStreak(habit: Habit, dateKey: string) {
  if (habit.frequency === 'daily') {
    return !isWeekendDate(parseDateKey(dateKey));
  }

  return shouldHabitAppearOnDate(habit, dateKey);
}

function shouldInspectDate(habit: Habit, dateKey: string) {
  if (habit.frequency === 'daily') {
    return true;
  }

  return shouldHabitAppearOnDate(habit, dateKey);
}

function countCurrentStreak(habit: Habit, completionDates: Set<string>, today: string) {
  let streak = 0;
  let cursor = parseDateKey(today);

  for (let inspectedDays = 0; inspectedDays < STREAK_LOOKBACK_DAYS; inspectedDays += 1) {
    const dateKey = getTodayDateKey(cursor);
    const completed = completionDates.has(dateKey);

    if (completed) {
      streak += 1;
    } else if (dateKey !== today && isRequiredForStreak(habit, dateKey)) {
      break;
    }

    cursor = subDays(cursor, 1);
  }

  return streak;
}

function countBestStreak(habit: Habit, completionDates: Set<string>, today: string) {
  const dates = [...completionDates].sort();
  const firstCompletion = dates[0];

  if (!firstCompletion) {
    return 0;
  }

  let cursor = parseDateKey(firstCompletion);
  const end = parseDateKey(today);
  let streak = 0;
  let bestStreak = 0;
  let inspectedDays = 0;

  while (!isAfter(cursor, end) && inspectedDays < STREAK_LOOKBACK_DAYS) {
    const dateKey = getTodayDateKey(cursor);

    if (completionDates.has(dateKey)) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else if (isRequiredForStreak(habit, dateKey)) {
      streak = 0;
    }

    cursor = addDays(cursor, 1);
    inspectedDays += 1;
  }

  return bestStreak;
}

function buildConsistencyLabel(habit: Habit, completionDates: Set<string>, today: string) {
  let requiredCount = 0;
  let completedCount = 0;
  let cursor = parseDateKey(today);

  for (let dayOffset = 0; dayOffset < CONSISTENCY_LOOKBACK_DAYS; dayOffset += 1) {
    const dateKey = getTodayDateKey(cursor);

    if (isRequiredForStreak(habit, dateKey)) {
      requiredCount += 1;

      if (completionDates.has(dateKey)) {
        completedCount += 1;
      }
    }

    cursor = subDays(cursor, 1);
  }

  if (requiredCount === 0) {
    return 'Sem ciclos recentes';
  }

  const percentage = Math.round((completedCount / requiredCount) * 100);

  if (habit.frequency === 'daily') {
    return `${percentage}% nos últimos 30 dias úteis`;
  }

  return `${completedCount} de ${requiredCount} ciclos recentes`;
}

export function calculateHabitStreakSnapshot(
  habit: Habit,
  completionDates: Set<string>,
  today = getTodayDateKey()
): HabitStreakSnapshot {
  const relevantCompletions = new Set(
    [...completionDates].filter((dateKey) => shouldInspectDate(habit, dateKey))
  );
  const currentStreak = countCurrentStreak(habit, relevantCompletions, today);
  const bestStreak = countBestStreak(habit, relevantCompletions, today);
  const consistencyLabel = buildConsistencyLabel(habit, relevantCompletions, today);

  return {
    bestStreak,
    consistencyLabel,
    currentStreak,
  };
}
