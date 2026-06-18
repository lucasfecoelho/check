import { getMonthDay, getWeekdayIndex, isLastDayOfMonth, parseDateKey } from './date';
import type { Habit, HabitFrequency } from './types';

// day_of_month = -1 represents "Último dia do mês" for monthly habits.
export const LAST_DAY_OF_MONTH = -1;

export const weekdayOptions = [
  { label: 'Domingo', shortLabel: 'Dom', value: 0 },
  { label: 'Segunda', shortLabel: 'Seg', value: 1 },
  { label: 'Terça', shortLabel: 'Ter', value: 2 },
  { label: 'Quarta', shortLabel: 'Qua', value: 3 },
  { label: 'Quinta', shortLabel: 'Qui', value: 4 },
  { label: 'Sexta', shortLabel: 'Sex', value: 5 },
  { label: 'Sábado', shortLabel: 'Sáb', value: 6 },
] as const;

export const frequencyLabels: Record<HabitFrequency, string> = {
  daily: 'Diário',
  monthly: 'Mensal',
  weekly: 'Semanal',
};

export function parseHabitWeekdays(daysOfWeek: string | null) {
  if (!daysOfWeek) {
    return [];
  }

  try {
    const parsed = JSON.parse(daysOfWeek);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  } catch {
    return [];
  }
}

export function serializeHabitWeekdays(daysOfWeek?: number[] | null) {
  if (!daysOfWeek?.length) {
    return null;
  }

  const normalizedDays = Array.from(
    new Set(daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))
  ).sort((a, b) => a - b);

  return normalizedDays.length > 0 ? JSON.stringify(normalizedDays) : null;
}

export function shouldHabitAppearOnDate(
  habit: Pick<Habit, 'day_of_month' | 'days_of_week' | 'frequency'>,
  dateKey: string
) {
  const date = parseDateKey(dateKey);

  if (habit.frequency === 'daily') {
    return true;
  }

  if (habit.frequency === 'weekly') {
    return parseHabitWeekdays(habit.days_of_week).includes(getWeekdayIndex(date));
  }

  if (habit.frequency === 'monthly') {
    if (habit.day_of_month === LAST_DAY_OF_MONTH) {
      return isLastDayOfMonth(date);
    }

    return habit.day_of_month === getMonthDay(date);
  }

  return false;
}

export function getWeekdayLabel(day: number) {
  return weekdayOptions.find((option) => option.value === day)?.label ?? '';
}

export function getHabitScheduleLabel(
  habit: Pick<Habit, 'day_of_month' | 'days_of_week' | 'frequency' | 'time'>
) {
  if (habit.frequency === 'daily') {
    return `Diário · ${habit.time}`;
  }

  if (habit.frequency === 'weekly') {
    const days = parseHabitWeekdays(habit.days_of_week).map(getWeekdayLabel).join(', ');
    return `Semanal · ${days || 'Sem dia'} · ${habit.time}`;
  }

  if (habit.day_of_month === LAST_DAY_OF_MONTH) {
    return `Mensal · Último dia · ${habit.time}`;
  }

  return `Mensal · Dia ${habit.day_of_month ?? '-'} · ${habit.time}`;
}
