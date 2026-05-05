import {
  COMPLETE_TASK_SQL,
  DELETE_TASK_SQL,
  INSERT_TASK_SQL,
  SELECT_SETTING_VALUE_SQL,
  SELECT_TASK_BY_ID_SQL,
  SELECT_TODAY_TASKS_SQL,
  SELECT_UPCOMING_TASKS_SQL,
  UPDATE_TASK_NOTIFICATION_IDS_SQL,
  UPDATE_TASK_SQL,
} from './schema';
import {
  DEFAULT_TASK_TIME,
  getTimestamp,
  getTodayDateKey,
  isDateKeyValid,
  isTaskTimeValid,
  normalizeTaskTime,
} from './date';
import { getDatabase } from './client';
import { cleanupOldTasks } from './queries';
import { createId } from './id';
import type { CreateTaskInput, TaskWithCategory, UpdateTaskInput } from './types';

type SettingValueRow = {
  value: string;
};

const emptyNotificationIds = {
  notification30MinId: null,
  notificationDueId: null,
};

async function getNotificationService() {
  try {
    return await import('@/services/notifications');
  } catch (error) {
    console.warn('[Check][notifications] Failed to load notification service', error);
    return null;
  }
}

function validateTaskInput(input: CreateTaskInput | UpdateTaskInput) {
  const title = input.title.trim();
  const categoryId = input.category_id.trim();
  const date = input.date.trim();
  const time = normalizeTaskTime(input.time);

  if (!title) {
    throw new Error('Informe um título para a tarefa.');
  }

  if (!categoryId) {
    throw new Error('Escolha uma categoria.');
  }

  if (!date) {
    throw new Error('Informe uma data.');
  }

  if (!isDateKeyValid(date)) {
    throw new Error('Use a data no formato YYYY-MM-DD.');
  }

  if (!isTaskTimeValid(time)) {
    throw new Error('Use o horário no formato HH:mm.');
  }

  return {
    categoryId,
    date,
    time,
    title,
  };
}

async function getDefaultTaskTime() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingValueRow>(SELECT_SETTING_VALUE_SQL, [
    'default_task_time',
  ]);

  return row?.value || DEFAULT_TASK_TIME;
}

export async function createTask(input: CreateTaskInput) {
  const defaultTime = await getDefaultTaskTime();
  const data = validateTaskInput({
    ...input,
    time: normalizeTaskTime(input.time || defaultTime),
  });
  const db = await getDatabase();
  const timestamp = getTimestamp();
  const id = createId('task');

  await db.runAsync(INSERT_TASK_SQL, [
    id,
    data.title,
    data.categoryId,
    data.date,
    data.time,
    timestamp,
    timestamp,
  ]);

  const task = await getTaskById(id);

  if (!task) {
    return null;
  }

  const notificationService = await getNotificationService();
  const notificationIds = notificationService
    ? await notificationService.scheduleTaskNotifications(task)
    : emptyNotificationIds;
  await db.runAsync(UPDATE_TASK_NOTIFICATION_IDS_SQL, [
    notificationIds.notification30MinId,
    notificationIds.notificationDueId,
    getTimestamp(),
    id,
  ]);

  return getTaskById(id);
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const defaultTime = await getDefaultTaskTime();
  const data = validateTaskInput({
    ...input,
    time: normalizeTaskTime(input.time || defaultTime),
  });
  const db = await getDatabase();
  const previousTask = await getTaskById(id);

  const notificationService = await getNotificationService();

  if (notificationService) {
    await notificationService.cancelTaskNotifications(previousTask);
  }

  await db.runAsync(UPDATE_TASK_SQL, [
    data.title,
    data.categoryId,
    data.date,
    data.time,
    getTimestamp(),
    id,
  ]);

  const task = await getTaskById(id);

  if (!task) {
    return null;
  }

  const notificationIds = notificationService
    ? await notificationService.scheduleTaskNotifications(task)
    : emptyNotificationIds;
  await db.runAsync(UPDATE_TASK_NOTIFICATION_IDS_SQL, [
    notificationIds.notification30MinId,
    notificationIds.notificationDueId,
    getTimestamp(),
    id,
  ]);

  return getTaskById(id);
}

export async function deleteTask(id: string) {
  const db = await getDatabase();
  const task = await getTaskById(id);

  const notificationService = await getNotificationService();

  if (notificationService) {
    await notificationService.cancelTaskNotifications(task);
  }

  await db.runAsync(DELETE_TASK_SQL, [id]);
}

export async function completeTask(id: string) {
  const db = await getDatabase();
  const task = await getTaskById(id);

  const notificationService = await getNotificationService();

  if (notificationService) {
    await notificationService.cancelTaskNotifications(task);
  }

  await db.runAsync(COMPLETE_TASK_SQL, [getTimestamp(), id]);
}

export async function getTodayTasks() {
  await cleanupOldTasks();

  const db = await getDatabase();
  const today = getTodayDateKey();

  return db.getAllAsync<TaskWithCategory>(SELECT_TODAY_TASKS_SQL, [today]);
}

export async function getUpcomingTasks() {
  await cleanupOldTasks();

  const db = await getDatabase();
  const today = getTodayDateKey();

  return db.getAllAsync<TaskWithCategory>(SELECT_UPCOMING_TASKS_SQL, [today]);
}

export async function getTaskById(id: string) {
  const db = await getDatabase();

  return db.getFirstAsync<TaskWithCategory>(SELECT_TASK_BY_ID_SQL, [id]);
}
