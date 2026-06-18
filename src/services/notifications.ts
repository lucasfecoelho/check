import { addDays, addMinutes, isAfter, subMinutes } from 'date-fns';
// Import only local-notification modules. The expo-notifications root import loads
// push-token auto-registration side effects, which are not used by Check.
import cancelAllScheduledNotificationsAsync from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import cancelScheduledNotificationAsync from 'expo-notifications/build/cancelScheduledNotificationAsync';
import {
  AndroidImportance,
} from 'expo-notifications/build/NotificationChannelManager.types';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
} from 'expo-notifications/build/Notifications.types';
import scheduleNotificationAsync from 'expo-notifications/build/scheduleNotificationAsync';
import setNotificationChannelAsync from 'expo-notifications/build/setNotificationChannelAsync';
import { Platform } from 'react-native';

import { getDatabase } from '@/database/client';
import {
  getTimestamp,
  getTodayDateKey,
  parseTaskDateTime,
} from '@/database/date';
import { shouldHabitAppearOnDate } from '@/database/habitRules';
import {
  CLEAR_ALL_NOTIFICATION_IDS_SQL,
  SELECT_SLEEP_ENTRIES_BETWEEN_SQL,
  SELECT_HABITS_WITH_CATEGORY_SQL,
  SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL,
  SELECT_SETTING_VALUE_SQL,
  SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL,
  SELECT_UPCOMING_TASKS_SQL,
  UPDATE_HABIT_NOTIFICATION_ID_SQL,
  UPDATE_SETTING_SQL,
  UPDATE_TASK_NOTIFICATION_IDS_SQL,
} from '@/database/schema';
import type { HabitCompletion, HabitWithCategory, SleepEntry, TaskWithCategory } from '@/database/types';

import {
  buildHabitNotificationContent,
  buildTaskNotificationContent,
  buildWaterReminderNotificationContent,
  type NotificationContent,
} from './notificationMessages';

const CHANNEL_ID = 'check-reminders';
const NOTIFICATIONS_SETTING_KEY = 'notifications_enabled';
const TASK_REMINDER_LEAD_MINUTES_SETTING_KEY = 'task_reminder_lead_minutes';
const SLEEP_NOTIFICATION_IDS_SETTING_KEY = 'sleep_notification_ids';
const DEFAULT_TASK_REMINDER_LEAD_MINUTES = 30;
const VALID_TASK_REMINDER_LEAD_MINUTES = [10, 30, 60] as const;
const HABIT_NOTIFICATION_OCCURRENCE_COUNT = 14;
const WATER_REMINDER_LOOKAHEAD_DAYS = 7;
const WATER_REMINDER_MAX_NOTIFICATION_COUNT = 48;
const DEFAULT_WATER_REMINDER_START_TIME = '08:00';
const DEFAULT_WATER_REMINDER_END_TIME = '22:00';
const DEFAULT_WATER_REMINDER_INTERVAL_MINUTES = 60;
const SLEEP_REMINDER_TIME = '09:00';
const SLEEP_REMINDER_LOOKAHEAD_DAYS = 14;
let isNotificationHandlerConfigured = false;

type NotificationIds = {
  notification30MinId: string | null;
  notificationDueId: string | null;
};

type SettingValueRow = {
  value: string;
};

type DayProgress = {
  completedCount: number;
  totalCount: number;
};

export function configureNotificationHandler() {
  if (isNotificationHandlerConfigured) {
    return;
  }

  console.log('[Check][notifications] configuring handler');
  setNotificationHandler({
    handleNotification: async () => ({
      priority: AndroidNotificationPriority.HIGH,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  isNotificationHandlerConfigured = true;
}

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await setNotificationChannelAsync(CHANNEL_ID, {
      importance: AndroidImportance.HIGH,
      lightColor: '#7C3AED',
      name: 'Lembretes do Check',
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (error) {
    console.warn('Failed to configure notification channel', error);
  }
}

export async function requestNotificationPermission() {
  try {
    configureNotificationHandler();
    await ensureAndroidNotificationChannel();

    const current = await getPermissionsAsync();

    if (current.granted) {
      return true;
    }

    const requested = await requestPermissionsAsync();

    return requested.granted;
  } catch (error) {
    console.warn('Failed to request notification permission', error);
    return false;
  }
}

export async function areNotificationsEnabled() {
  const db = await getDatabase();
  const setting = await db.getFirstAsync<SettingValueRow>(SELECT_SETTING_VALUE_SQL, [
    NOTIFICATIONS_SETTING_KEY,
  ]);

  return setting?.value !== 'false';
}

async function setNotificationsEnabledValue(enabled: boolean) {
  const db = await getDatabase();

  await db.runAsync(UPDATE_SETTING_SQL, [NOTIFICATIONS_SETTING_KEY, enabled ? 'true' : 'false']);
}

async function getTaskReminderLeadMinutes() {
  const db = await getDatabase();
  const setting = await db.getFirstAsync<SettingValueRow>(SELECT_SETTING_VALUE_SQL, [
    TASK_REMINDER_LEAD_MINUTES_SETTING_KEY,
  ]);
  const parsedValue = Number(setting?.value);

  return VALID_TASK_REMINDER_LEAD_MINUTES.includes(
    parsedValue as (typeof VALID_TASK_REMINDER_LEAD_MINUTES)[number]
  )
    ? parsedValue
    : DEFAULT_TASK_REMINDER_LEAD_MINUTES;
}

function getTaskReminderLeadLabel(minutes: number) {
  return minutes === 60 ? '1 hora' : `${minutes} minutos`;
}

async function getDayProgress(dateKey: string): Promise<DayProgress> {
  const db = await getDatabase();
  const [tasks, habits, habitCompletions] = await Promise.all([
    db.getAllAsync<TaskWithCategory>(
      `
      ${SELECT_TASKS_WITH_CATEGORY_FIELDS_SQL}
      WHERE tasks.date = ?;
      `,
      [dateKey]
    ),
    db.getAllAsync<HabitWithCategory>(SELECT_HABITS_WITH_CATEGORY_SQL),
    db.getAllAsync<HabitCompletion>(SELECT_HABIT_COMPLETIONS_FOR_DATE_SQL, [dateKey]),
  ]);
  const completedHabitIds = new Set(habitCompletions.map((completion) => completion.habit_id));
  const expectedHabits = habits.filter((habit) => shouldHabitAppearOnDate(habit, dateKey));
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const completedHabits = expectedHabits.filter((habit) => completedHabitIds.has(habit.id));

  return {
    completedCount: completedTasks.length + completedHabits.length,
    totalCount: tasks.length + expectedHabits.length,
  };
}

async function getHabitCompletedDateKeysFromToday(habitId: string) {
  const db = await getDatabase();
  const today = getTodayDateKey();
  const completions = await db.getAllAsync<HabitCompletion>(
    `
    SELECT id, habit_id, date, completed_at
    FROM habit_completions
    WHERE habit_id = ? AND date >= ?;
    `,
    [habitId, today]
  );

  return new Set(completions.map((completion) => completion.date));
}

async function getHabitProgressValueOnDate(habitId: string, dateKey: string) {
  const db = await getDatabase();
  const progress = await db.getFirstAsync<{ value: number }>(
    `
    SELECT value
    FROM habit_progress
    WHERE habit_id = ? AND date = ?
    LIMIT 1;
    `,
    [habitId, dateKey]
  );

  return progress?.value ?? 0;
}

async function canScheduleNotifications() {
  if (!(await areNotificationsEnabled())) {
    return false;
  }

  return requestNotificationPermission();
}

function getScheduledDate(date: string, time: string) {
  const parsed = parseTaskDateTime(date, time);

  return isAfter(parsed, new Date()) ? parsed : null;
}

function stringifyNotificationIds(ids: string[]) {
  return ids.length > 0 ? JSON.stringify(ids) : null;
}

async function getSettingValue(key: string) {
  const db = await getDatabase();
  const setting = await db.getFirstAsync<SettingValueRow>(SELECT_SETTING_VALUE_SQL, [key]);

  return setting?.value ?? null;
}

async function setSettingValue(key: string, value: string) {
  const db = await getDatabase();

  await db.runAsync(UPDATE_SETTING_SQL, [key, value]);
}

async function getHabitNotificationDates(
  habit: Pick<
    HabitWithCategory,
    'day_of_month' | 'days_of_week' | 'frequency' | 'id' | 'time'
  >
) {
  const dates: Date[] = [];
  const now = new Date();
  const completedDateKeys = await getHabitCompletedDateKeysFromToday(habit.id);
  let cursor = now;
  let inspectedDays = 0;

  while (dates.length < HABIT_NOTIFICATION_OCCURRENCE_COUNT && inspectedDays < 370) {
    const dateKey = getTodayDateKey(cursor);

    if (shouldHabitAppearOnDate(habit, dateKey) && !completedDateKeys.has(dateKey)) {
      const candidate = parseTaskDateTime(dateKey, habit.time);

      if (isAfter(candidate, now)) {
        dates.push(candidate);
      }
    }

    cursor = addDays(cursor, 1);
    inspectedDays += 1;
  }

  return dates;
}

function parseNotificationIdList(notificationId?: string | null) {
  if (!notificationId) {
    return [];
  }

  try {
    const parsed = JSON.parse(notificationId);

    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [notificationId];
  } catch {
    return [notificationId];
  }
}

function isWaterReminderEnabled(
  habit: Pick<
    HabitWithCategory,
    | 'target_value'
    | 'tracking_type'
    | 'water_reminder_enabled'
  >
) {
  return (
    habit.tracking_type === 'quantitative' &&
    Boolean(habit.target_value) &&
    habit.water_reminder_enabled === 1
  );
}

async function getWaterReminderDates(
  habit: Pick<
    HabitWithCategory,
    | 'day_of_month'
    | 'days_of_week'
    | 'frequency'
    | 'id'
    | 'target_value'
    | 'tracking_type'
    | 'water_reminder_enabled'
    | 'water_reminder_end_time'
    | 'water_reminder_interval_minutes'
    | 'water_reminder_start_time'
  >
) {
  if (!isWaterReminderEnabled(habit)) {
    return [];
  }

  const dates: Date[] = [];
  const now = new Date();
  const todayKey = getTodayDateKey();
  const completedDateKeys = await getHabitCompletedDateKeysFromToday(habit.id);
  const todayProgress = await getHabitProgressValueOnDate(habit.id, todayKey);
  const hasReachedTodayTarget =
    typeof habit.target_value === 'number' && todayProgress >= habit.target_value;
  const intervalMinutes =
    habit.water_reminder_interval_minutes > 0
      ? habit.water_reminder_interval_minutes
      : DEFAULT_WATER_REMINDER_INTERVAL_MINUTES;

  for (let dayOffset = 0; dayOffset < WATER_REMINDER_LOOKAHEAD_DAYS; dayOffset += 1) {
    const day = addDays(now, dayOffset);
    const dateKey = getTodayDateKey(day);

    if (!shouldHabitAppearOnDate(habit, dateKey)) {
      continue;
    }

    if (dateKey === todayKey && (completedDateKeys.has(dateKey) || hasReachedTodayTarget)) {
      continue;
    }

    const startAt = parseTaskDateTime(
      dateKey,
      habit.water_reminder_start_time || DEFAULT_WATER_REMINDER_START_TIME
    );
    const endAt = parseTaskDateTime(
      dateKey,
      habit.water_reminder_end_time || DEFAULT_WATER_REMINDER_END_TIME
    );
    let cursor = startAt;

    while (
      cursor.getTime() <= endAt.getTime() &&
      dates.length < WATER_REMINDER_MAX_NOTIFICATION_COUNT
    ) {
      if (isAfter(cursor, now)) {
        dates.push(cursor);
      }

      cursor = addMinutes(cursor, intervalMinutes);
    }

    if (dates.length >= WATER_REMINDER_MAX_NOTIFICATION_COUNT) {
      break;
    }
  }

  return dates;
}

async function scheduleAtDate(
  content: NotificationContent,
  date: Date,
  data: Record<string, unknown>
) {
  return scheduleNotificationAsync({
    content: {
      body: content.body,
      data,
      priority: AndroidNotificationPriority.HIGH,
      sound: 'default',
      title: content.title,
    },
    trigger: {
      channelId: CHANNEL_ID,
      date,
      type: SchedulableTriggerInputTypes.DATE,
    },
  });
}

async function cancelNotificationIds(ids: string[]) {
  await Promise.all(
    ids.map((id) =>
      cancelScheduledNotificationAsync(id).catch((error) => {
        console.warn('Failed to cancel scheduled notification', error);
      })
    )
  );
}

async function getSleepReminderDates() {
  const now = new Date();
  const startKey = getTodayDateKey(now);
  const endKey = getTodayDateKey(addDays(now, SLEEP_REMINDER_LOOKAHEAD_DAYS));
  const db = await getDatabase();
  const entries = await db.getAllAsync<SleepEntry>(SELECT_SLEEP_ENTRIES_BETWEEN_SQL, [
    startKey,
    endKey,
  ]);
  const recordedDates = new Set(entries.map((entry) => entry.date));
  const dates: Date[] = [];

  for (let dayOffset = 0; dayOffset < SLEEP_REMINDER_LOOKAHEAD_DAYS; dayOffset += 1) {
    const day = addDays(now, dayOffset);
    const dateKey = getTodayDateKey(day);
    const reminderAt = parseTaskDateTime(dateKey, SLEEP_REMINDER_TIME);

    if (recordedDates.has(dateKey)) {
      continue;
    }

    if (isAfter(reminderAt, now)) {
      dates.push(reminderAt);
    }
  }

  return dates;
}

export async function cancelSleepReminderNotification() {
  const notificationIds = parseNotificationIdList(
    await getSettingValue(SLEEP_NOTIFICATION_IDS_SETTING_KEY)
  );

  await cancelNotificationIds(notificationIds);
  await setSettingValue(SLEEP_NOTIFICATION_IDS_SETTING_KEY, '');
}

export async function rescheduleSleepReminderNotification() {
  configureNotificationHandler();
  await cancelSleepReminderNotification();

  if (!(await canScheduleNotifications())) {
    return null;
  }

  const dates = await getSleepReminderDates();
  const ids: string[] = [];

  for (const date of dates) {
    ids.push(
      await scheduleAtDate(
        {
          body: 'Registre seu sono e acompanhe sua rotina.',
          title: 'Quantas horas voce dormiu hoje?',
        },
        date,
        {
          date: getTodayDateKey(date),
          route: '/',
          screen: 'sleep',
          type: 'sleep-reminder',
        }
      )
    );
  }

  const serializedIds = stringifyNotificationIds(ids);

  await setSettingValue(SLEEP_NOTIFICATION_IDS_SETTING_KEY, serializedIds ?? '');

  return serializedIds;
}

export async function scheduleTaskNotifications(
  task: Pick<TaskWithCategory, 'date' | 'id' | 'status' | 'time' | 'title'>
) {
  configureNotificationHandler();

  const ids: NotificationIds = {
    notification30MinId: null,
    notificationDueId: null,
  };

  if (!(await canScheduleNotifications())) {
    return ids;
  }

  try {
    if (task.status === 'completed') {
      return ids;
    }

    const dueAt = getScheduledDate(task.date, task.time);

    if (!dueAt) {
      return ids;
    }

    const reminderLeadMinutes = await getTaskReminderLeadMinutes();
    const reminderBeforeDue = subMinutes(dueAt, reminderLeadMinutes);
    const dayProgress = await getDayProgress(task.date);

    if (isAfter(reminderBeforeDue, new Date())) {
      const reminderContent = buildTaskNotificationContent(
        {
          dayProgress,
          reminderLeadLabel: getTaskReminderLeadLabel(reminderLeadMinutes),
          time: task.time,
          title: task.title,
        },
        'before-due'
      );

      if (reminderContent) {
        ids.notification30MinId = await scheduleAtDate(
          reminderContent,
          reminderBeforeDue,
          { reminderLeadMinutes, taskId: task.id, type: 'task-before-due' }
        );
      }
    }

    const dueContent = buildTaskNotificationContent(
      {
        dayProgress,
        time: task.time,
        title: task.title,
      },
      'due'
    );

    if (dueContent) {
      ids.notificationDueId = await scheduleAtDate(
        dueContent,
        dueAt,
        { taskId: task.id, type: 'task-due' }
      );
    }

    return ids;
  } catch (error) {
    console.warn('Failed to schedule task notifications', error);
    return ids;
  }
}

export async function cancelTaskNotifications(
  task: Pick<TaskWithCategory, 'notification_30min_id' | 'notification_due_id'> | null
) {
  const ids = [task?.notification_30min_id, task?.notification_due_id].filter(
    (id): id is string => Boolean(id)
  );

  await cancelNotificationIds(ids);
}

export async function scheduleHabitNotification(
  habit: Pick<
    HabitWithCategory,
    | 'current_streak'
    | 'day_of_month'
    | 'days_of_week'
    | 'frequency'
    | 'id'
    | 'target_unit'
    | 'target_value'
    | 'time'
    | 'title'
    | 'tracking_type'
    | 'water_reminder_enabled'
    | 'water_reminder_end_time'
    | 'water_reminder_interval_minutes'
    | 'water_reminder_start_time'
  >
) {
  configureNotificationHandler();

  if (!(await canScheduleNotifications())) {
    return null;
  }

  try {
    const notificationDates = await getHabitNotificationDates(habit);
    const waterReminderDates = await getWaterReminderDates(habit);
    const scheduledIds: string[] = [];

    for (const date of notificationDates) {
      const dateKey = getTodayDateKey(date);
      const dayProgress = await getDayProgress(dateKey);
      const isTodayReminder = dateKey === getTodayDateKey();
      const quantitativeValue = isTodayReminder
        ? await getHabitProgressValueOnDate(habit.id, dateKey)
        : 0;
      const content = buildHabitNotificationContent({
        currentStreak: isTodayReminder ? habit.current_streak : null,
        dayProgress,
        quantitativeProgress:
          isTodayReminder &&
          habit.tracking_type === 'quantitative' &&
          habit.target_value &&
          quantitativeValue > 0
            ? {
                current: String(quantitativeValue),
                target: String(habit.target_value),
                unit: habit.target_unit ?? undefined,
              }
            : null,
        title: habit.title,
      });

      if (content) {
        scheduledIds.push(
          await scheduleAtDate(content, date, {
            date: dateKey,
            habitId: habit.id,
            type: 'habit',
          })
        );
      }
    }

    for (const date of waterReminderDates) {
      const dateKey = getTodayDateKey(date);
      const isTodayReminder = dateKey === getTodayDateKey();
      const quantitativeValue = isTodayReminder
        ? await getHabitProgressValueOnDate(habit.id, dateKey)
        : 0;
      const content = buildWaterReminderNotificationContent({
        quantitativeProgress: isTodayReminder
          ? {
              current: quantitativeValue,
              target: habit.target_value ?? 0,
              unit: habit.target_unit ?? undefined,
            }
          : null,
        title: habit.title,
      });

      if (content) {
        scheduledIds.push(
          await scheduleAtDate(content, date, {
            date: dateKey,
            habitId: habit.id,
            type: 'water-reminder',
          })
        );
      }
    }

    return stringifyNotificationIds(scheduledIds);
  } catch (error) {
    console.warn('Failed to schedule habit notification', error);
    return null;
  }
}

export async function cancelHabitNotification(
  habit: Pick<HabitWithCategory, 'notification_id'> | null
) {
  const ids = parseNotificationIdList(habit?.notification_id);

  await cancelNotificationIds(ids);
}

export async function cancelAllCheckNotifications() {
  const db = await getDatabase();

  await cancelAllScheduledNotificationsAsync();
  await db.execAsync(CLEAR_ALL_NOTIFICATION_IDS_SQL);
  await db.runAsync(UPDATE_SETTING_SQL, [SLEEP_NOTIFICATION_IDS_SETTING_KEY, '']);
}

export async function updateNotificationsEnabled(enabled: boolean) {
  await setNotificationsEnabledValue(enabled);

  if (!enabled) {
    await cancelAllCheckNotifications();
    return false;
  }

  const granted = await requestNotificationPermission();

  if (!granted) {
    await setNotificationsEnabledValue(false);
    return false;
  }

  await rescheduleAllNotifications();
  return true;
}

export async function rescheduleAllNotifications() {
  if (!(await canScheduleNotifications())) {
    return;
  }

  const db = await getDatabase();
  const today = getTodayDateKey();
  const [tasks, habits] = await Promise.all([
    db.getAllAsync<TaskWithCategory>(SELECT_UPCOMING_TASKS_SQL, [today]),
    db.getAllAsync<HabitWithCategory>(SELECT_HABITS_WITH_CATEGORY_SQL),
  ]);

  for (const task of tasks) {
    await cancelTaskNotifications(task);
    const ids = await scheduleTaskNotifications(task);
    await db.runAsync(UPDATE_TASK_NOTIFICATION_IDS_SQL, [
      ids.notification30MinId,
      ids.notificationDueId,
      getTimestamp(),
      task.id,
    ]);
  }

  for (const habit of habits) {
    await cancelHabitNotification(habit);
    const notificationId = await scheduleHabitNotification(habit);
    await db.runAsync(UPDATE_HABIT_NOTIFICATION_ID_SQL, [
      notificationId,
      getTimestamp(),
      habit.id,
    ]);
  }

  await rescheduleSleepReminderNotification();
}
