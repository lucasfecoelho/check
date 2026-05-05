import { isAfter, subMinutes } from 'date-fns';
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
import { parseHabitWeekdays } from '@/database/habitRules';
import {
  CLEAR_ALL_NOTIFICATION_IDS_SQL,
  SELECT_HABITS_WITH_CATEGORY_SQL,
  SELECT_SETTING_VALUE_SQL,
  SELECT_UPCOMING_TASKS_SQL,
  UPDATE_HABIT_NOTIFICATION_ID_SQL,
  UPDATE_SETTING_SQL,
  UPDATE_TASK_NOTIFICATION_IDS_SQL,
} from '@/database/schema';
import type { HabitWithCategory, TaskWithCategory } from '@/database/types';

const CHANNEL_ID = 'check-reminders';
const NOTIFICATIONS_SETTING_KEY = 'notifications_enabled';
let isNotificationHandlerConfigured = false;

type NotificationIds = {
  notification30MinId: string | null;
  notificationDueId: string | null;
};

type SettingValueRow = {
  value: string;
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

function parseTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);

  return { hour, minute };
}

function stringifyNotificationIds(ids: string[]) {
  return ids.length > 0 ? JSON.stringify(ids) : null;
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

async function scheduleAtDate(title: string, body: string, date: Date, data: Record<string, unknown>) {
  return scheduleNotificationAsync({
    content: {
      body,
      data,
      priority: AndroidNotificationPriority.HIGH,
      sound: 'default',
      title,
    },
    trigger: {
      channelId: CHANNEL_ID,
      date,
      type: SchedulableTriggerInputTypes.DATE,
    },
  });
}

export async function scheduleTaskNotifications(task: Pick<TaskWithCategory, 'date' | 'id' | 'time' | 'title'>) {
  configureNotificationHandler();

  const ids: NotificationIds = {
    notification30MinId: null,
    notificationDueId: null,
  };

  if (!(await canScheduleNotifications())) {
    return ids;
  }

  try {
    const dueAt = getScheduledDate(task.date, task.time);

    if (!dueAt) {
      return ids;
    }

    const thirtyMinutesBefore = subMinutes(dueAt, 30);

    if (isAfter(thirtyMinutesBefore, new Date())) {
      ids.notification30MinId = await scheduleAtDate(
        `⚠️ ${task.title}`,
        'Prazo em 30 minutos',
        thirtyMinutesBefore,
        { taskId: task.id, type: 'task-30min' }
      );
    }

    ids.notificationDueId = await scheduleAtDate(
      `⚠️ ${task.title}`,
      `Prazo ${task.time}`,
      dueAt,
      { taskId: task.id, type: 'task-due' }
    );

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

  await Promise.all(
    ids.map((id) =>
      cancelScheduledNotificationAsync(id).catch((error) => {
        console.warn('Failed to cancel task notification', error);
      })
    )
  );
}

export async function scheduleHabitNotification(
  habit: Pick<
    HabitWithCategory,
    'day_of_month' | 'days_of_week' | 'frequency' | 'id' | 'time' | 'title'
  >
) {
  configureNotificationHandler();

  if (!(await canScheduleNotifications())) {
    return null;
  }

  try {
    const { hour, minute } = parseTime(habit.time);
    const content = {
      body: `Hábito de hoje · ${habit.time}`,
      data: { habitId: habit.id, type: 'habit' },
      priority: AndroidNotificationPriority.HIGH,
      sound: 'default' as const,
      title: `🔁 ${habit.title}`,
    };

    if (habit.frequency === 'daily') {
      return scheduleNotificationAsync({
        content,
        trigger: {
          channelId: CHANNEL_ID,
          hour,
          minute,
          type: SchedulableTriggerInputTypes.DAILY,
        },
      });
    }

    if (habit.frequency === 'weekly') {
      const scheduledIds = await Promise.all(
        parseHabitWeekdays(habit.days_of_week).map((day) =>
          scheduleNotificationAsync({
            content,
            trigger: {
              channelId: CHANNEL_ID,
              hour,
              minute,
              type: SchedulableTriggerInputTypes.WEEKLY,
              weekday: day + 1,
            },
          })
        )
      );

      return stringifyNotificationIds(scheduledIds);
    }

    if (!habit.day_of_month) {
      return null;
    }

    return scheduleNotificationAsync({
      content,
      trigger: {
        channelId: CHANNEL_ID,
        day: habit.day_of_month,
        hour,
        minute,
        type: SchedulableTriggerInputTypes.MONTHLY,
      },
    });
  } catch (error) {
    console.warn('Failed to schedule habit notification', error);
    return null;
  }
}

export async function cancelHabitNotification(
  habit: Pick<HabitWithCategory, 'notification_id'> | null
) {
  const ids = parseNotificationIdList(habit?.notification_id);

  await Promise.all(
    ids.map((id) =>
      cancelScheduledNotificationAsync(id).catch((error) => {
        console.warn('Failed to cancel habit notification', error);
      })
    )
  );
}

export async function cancelAllCheckNotifications() {
  const db = await getDatabase();

  await cancelAllScheduledNotificationsAsync();
  await db.execAsync(CLEAR_ALL_NOTIFICATION_IDS_SQL);
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
}
