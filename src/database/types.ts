export type TaskStatus = 'pending' | 'completed';

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export type Category = {
  color: string;
  created_at: string;
  icon: string;
  id: string;
  name: string;
};

export type Task = {
  category_id: string;
  created_at: string;
  date: string;
  id: string;
  notification_30min_id: string | null;
  notification_due_id: string | null;
  status: TaskStatus;
  time: string;
  title: string;
  updated_at: string;
};

export type TaskWithCategory = Task & {
  category_color: string;
  category_icon: string;
  category_name: string;
};

export type CreateTaskInput = {
  category_id: string;
  date: string;
  time?: string | null;
  title: string;
};

export type UpdateTaskInput = {
  category_id: string;
  date: string;
  time?: string | null;
  title: string;
};

export type Habit = {
  category_id: string;
  created_at: string;
  day_of_month: number | null;
  days_of_week: string | null;
  frequency: HabitFrequency;
  id: string;
  notification_id: string | null;
  time: string;
  title: string;
  updated_at: string;
};

export type HabitWithCategory = Habit & {
  category_color: string;
  category_icon: string;
  category_name: string;
};

export type TodayHabit = HabitWithCategory & {
  completed_at: string | null;
  is_completed: boolean;
};

export type CreateHabitInput = {
  category_id: string;
  day_of_month?: number | null;
  days_of_week?: number[] | null;
  frequency: HabitFrequency;
  time?: string | null;
  title: string;
};

export type UpdateHabitInput = CreateHabitInput;

export type HabitCompletion = {
  completed_at: string;
  date: string;
  habit_id: string;
  id: string;
};

export type Setting = {
  key: string;
  value: string;
};
