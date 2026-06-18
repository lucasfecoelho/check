import { getDatabase } from './client';
import { getTimestamp, getTodayDateKey, isDateKeyValid } from './date';
import { createId } from './id';
import {
  SELECT_SLEEP_ENTRIES_BETWEEN_SQL,
  SELECT_SLEEP_ENTRY_BY_DATE_SQL,
  UPSERT_SLEEP_ENTRY_SQL,
} from './schema';
import type { SaveSleepEntryInput, SleepEntry } from './types';

async function getNotificationService() {
  try {
    return await import('@/services/notifications');
  } catch (error) {
    console.warn('[Check][notifications] Failed to load notification service', error);
    return null;
  }
}

function validateSleepHours(hours: number) {
  const normalizedHours = Number(hours);

  if (!Number.isFinite(normalizedHours) || normalizedHours < 0 || normalizedHours > 24) {
    throw new Error('Informe horas de sono entre 0 e 24.');
  }

  return Number(normalizedHours.toFixed(2));
}

export async function getSleepEntryByDate(date = getTodayDateKey()) {
  const db = await getDatabase();

  return db.getFirstAsync<SleepEntry>(SELECT_SLEEP_ENTRY_BY_DATE_SQL, [date]);
}

export async function getTodaySleepEntry() {
  return getSleepEntryByDate(getTodayDateKey());
}

export async function getSleepEntriesBetween(startDate: string, endDate: string) {
  const db = await getDatabase();

  return db.getAllAsync<SleepEntry>(SELECT_SLEEP_ENTRIES_BETWEEN_SQL, [startDate, endDate]);
}

export async function saveSleepEntry(input: SaveSleepEntryInput) {
  const date = input.date?.trim() || getTodayDateKey();
  const hours = validateSleepHours(input.hours);

  if (!isDateKeyValid(date)) {
    throw new Error('Use a data no formato YYYY-MM-DD.');
  }

  const db = await getDatabase();
  const existing = await getSleepEntryByDate(date);
  const timestamp = getTimestamp();

  await db.runAsync(UPSERT_SLEEP_ENTRY_SQL, [
    existing?.id ?? createId('sleep'),
    date,
    hours,
    existing?.created_at ?? timestamp,
    timestamp,
  ]);

  const notificationService = await getNotificationService();

  if (notificationService) {
    await notificationService.rescheduleSleepReminderNotification();
  }

  return getSleepEntryByDate(date);
}
