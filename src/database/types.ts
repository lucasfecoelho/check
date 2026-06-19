export type TaskStatus = 'pending' | 'completed';

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type HabitTrackingType = 'checkbox' | 'quantitative';
export type WorkoutType =
  | 'chest_triceps'
  | 'back_biceps'
  | 'legs'
  | 'shoulders'
  | 'full_body'
  | 'cardio'
  | 'other';

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
  best_streak: number;
  category_id: string;
  created_at: string;
  current_streak: number;
  day_of_month: number | null;
  days_of_week: string | null;
  frequency: HabitFrequency;
  id: string;
  notification_id: string | null;
  quick_values: string | null;
  streak_updated_at: string | null;
  target_unit: string | null;
  target_value: number | null;
  time: string;
  title: string;
  tracking_type: HabitTrackingType;
  updated_at: string;
  water_reminder_enabled: 0 | 1;
  water_reminder_end_time: string | null;
  water_reminder_interval_minutes: number;
  water_reminder_start_time: string | null;
};

export type HabitWithCategory = Habit & {
  category_color: string;
  category_icon: string;
  category_name: string;
  consistency_label?: string;
};

export type TodayHabit = HabitWithCategory & {
  completed_at: string | null;
  progress_value: number;
  is_completed: boolean;
  workout_checkin_summary?: string | null;
};

export type CreateHabitInput = {
  category_id: string;
  day_of_month?: number | null;
  days_of_week?: number[] | null;
  frequency: HabitFrequency;
  quick_values?: number[] | null;
  target_unit?: string | null;
  target_value?: number | null;
  time?: string | null;
  title: string;
  tracking_type?: HabitTrackingType;
  water_reminder_enabled?: boolean;
  water_reminder_end_time?: string | null;
  water_reminder_interval_minutes?: number | null;
  water_reminder_start_time?: string | null;
};

export type UpdateHabitInput = CreateHabitInput;

export type HabitCompletion = {
  completed_at: string;
  date: string;
  habit_id: string;
  id: string;
};

export type HabitProgress = {
  date: string;
  habit_id: string;
  id: string;
  updated_at: string;
  value: number;
};

export type WorkoutCheckIn = {
  cardio_minutes: number | null;
  created_at: string;
  date: string;
  did_cardio: 0 | 1;
  habit_id: string;
  id: string;
  note: string | null;
  updated_at: string;
  workout_minutes: number;
  workout_type: WorkoutType;
};

export type SaveWorkoutCheckInInput = {
  cardio_minutes?: number | null;
  did_cardio: boolean;
  habit_id: string;
  note?: string | null;
  workout_minutes: number;
  workout_type: WorkoutType;
};

export type Setting = {
  key: string;
  value: string;
};

export type SleepEntry = {
  created_at: string;
  date: string;
  hours: number;
  id: string;
  updated_at: string;
};

export type SaveSleepEntryInput = {
  date?: string | null;
  hours: number;
};

export type NotebookEntryType = 'note' | 'list' | 'task';

export type NotebookEntryFilter = 'all' | NotebookEntryType | 'archived';

export type NotebookEntry = {
  archived: 0 | 1;
  content: string | null;
  created_at: string;
  id: string;
  title: string;
  type: NotebookEntryType;
  updated_at: string;
};

export type CreateNotebookEntryInput = {
  content?: string | null;
  title: string;
  type: NotebookEntryType;
};

export type UpdateNotebookEntryInput = CreateNotebookEntryInput;

export type NotebookItem = {
  completed: 0 | 1;
  created_at: string;
  id: string;
  note_id: string;
  position: number;
  title: string;
  updated_at: string;
};

export type CreateNotebookItemInput = {
  note_id: string;
  position: number;
  title: string;
};

export type UpdateNotebookItemInput = {
  position: number;
  title: string;
};

export type SyncNotebookItemInput = {
  completed: boolean;
  id?: string;
  title: string;
};
