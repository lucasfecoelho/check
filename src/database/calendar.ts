import {
  addDays,
  compareAsc,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { getDatabase } from './client';
import { getTodayDateKey } from './date';
import { shouldHabitAppearOnDate } from './habitRules';
import { getHabits } from './habits';
import { SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL } from './schema';
import type { HabitCompletion, HabitWithCategory, TaskWithCategory } from './types';

export type RoutineCalendarDayStatus = 'complete' | 'empty' | 'future' | 'missed' | 'partial';

export type RoutineCalendarItem = {
  category_color: string;
  category_icon: string;
  category_name: string;
  completed: boolean;
  id: string;
  time: string;
  title: string;
  type: 'habit' | 'task';
};

export type RoutineCalendarDay = {
  completedCount: number;
  dateKey: string;
  dayOfMonth: number;
  habitsCompleted: RoutineCalendarItem[];
  habitsPending: RoutineCalendarItem[];
  isCurrentMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
  status: RoutineCalendarDayStatus;
  tasksCompleted: RoutineCalendarItem[];
  tasksPending: RoutineCalendarItem[];
  totalCount: number;
};

type MonthRange = {
  endKey: string;
  gridEndKey: string;
  gridStartKey: string;
  startKey: string;
};

function getMonthRange(monthDate: Date): MonthRange {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return {
    endKey: getTodayDateKey(monthEnd),
    gridEndKey: getTodayDateKey(gridEnd),
    gridStartKey: getTodayDateKey(gridStart),
    startKey: getTodayDateKey(monthStart),
  };
}

function buildCalendarDates(monthDate: Date) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const dates: Date[] = [];
  let cursor = gridStart;

  while (compareAsc(cursor, gridEnd) <= 0) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function groupTasksByDate(tasks: TaskWithCategory[]) {
  return tasks.reduce<Map<string, TaskWithCategory[]>>((acc, task) => {
    const dayTasks = acc.get(task.date) ?? [];
    dayTasks.push(task);
    acc.set(task.date, dayTasks);

    return acc;
  }, new Map());
}

function groupCompletionsByDate(completions: HabitCompletion[]) {
  return completions.reduce<Map<string, Set<string>>>((acc, completion) => {
    const dayCompletions = acc.get(completion.date) ?? new Set<string>();
    dayCompletions.add(completion.habit_id);
    acc.set(completion.date, dayCompletions);

    return acc;
  }, new Map());
}

function createHabitItem(habit: HabitWithCategory, completed: boolean): RoutineCalendarItem {
  return {
    category_color: habit.category_color,
    category_icon: habit.category_icon,
    category_name: habit.category_name,
    completed,
    id: habit.id,
    time: habit.time,
    title: habit.title,
    type: 'habit',
  };
}

function createTaskItem(task: TaskWithCategory): RoutineCalendarItem {
  return {
    category_color: task.category_color,
    category_icon: task.category_icon,
    category_name: task.category_name,
    completed: task.status === 'completed',
    id: task.id,
    time: task.time,
    title: task.title,
    type: 'task',
  };
}

function getDayStatus(
  completedCount: number,
  totalCount: number,
  isFuture: boolean
): RoutineCalendarDayStatus {
  if (isFuture) {
    return 'future';
  }

  if (totalCount === 0) {
    return 'empty';
  }

  if (completedCount === totalCount) {
    return 'complete';
  }

  if (completedCount > 0) {
    return 'partial';
  }

  return 'missed';
}

async function getTasksForCalendarRange(startKey: string, endKey: string) {
  const db = await getDatabase();

  return db.getAllAsync<TaskWithCategory>(
    `
    ${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
    WHERE tasks.date BETWEEN ? AND ?
    ORDER BY tasks.date ASC, tasks.time ASC, tasks.created_at ASC;
    `,
    [startKey, endKey]
  );
}

async function getHabitCompletionsForCalendarRange(startKey: string, endKey: string) {
  const db = await getDatabase();

  return db.getAllAsync<HabitCompletion>(
    `
    SELECT id, habit_id, date, completed_at
    FROM habit_completions
    WHERE date BETWEEN ? AND ?
    ORDER BY date ASC, completed_at ASC;
    `,
    [startKey, endKey]
  );
}

export async function getRoutineCalendarMonth(monthDate = new Date()) {
  const todayKey = getTodayDateKey();
  const range = getMonthRange(monthDate);
  const [habits, tasks, completions] = await Promise.all([
    getHabits(),
    getTasksForCalendarRange(range.gridStartKey, range.gridEndKey),
    getHabitCompletionsForCalendarRange(range.gridStartKey, range.gridEndKey),
  ]);
  const tasksByDate = groupTasksByDate(tasks);
  const completionsByDate = groupCompletionsByDate(completions);
  const monthStart = startOfMonth(monthDate);

  return buildCalendarDates(monthDate).map<RoutineCalendarDay>((date) => {
    const dateKey = getTodayDateKey(date);
    const dayHabitCompletions = completionsByDate.get(dateKey) ?? new Set<string>();
    const expectedHabits = habits.filter((habit) => shouldHabitAppearOnDate(habit, dateKey));
    const habitItems = expectedHabits.map((habit) =>
      createHabitItem(habit, dayHabitCompletions.has(habit.id))
    );
    const taskItems = (tasksByDate.get(dateKey) ?? []).map(createTaskItem);
    const habitsCompleted = habitItems.filter((item) => item.completed);
    const habitsPending = habitItems.filter((item) => !item.completed);
    const tasksCompleted = taskItems.filter((item) => item.completed);
    const tasksPending = taskItems.filter((item) => !item.completed);
    const completedCount = habitsCompleted.length + tasksCompleted.length;
    const totalCount = habitItems.length + taskItems.length;
    const isFuture = compareAsc(date, new Date()) === 1;

    return {
      completedCount,
      dateKey,
      dayOfMonth: date.getDate(),
      habitsCompleted,
      habitsPending,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isFuture,
      isToday: dateKey === todayKey,
      status: getDayStatus(completedCount, totalCount, isFuture),
      tasksCompleted,
      tasksPending,
      totalCount,
    };
  });
}
