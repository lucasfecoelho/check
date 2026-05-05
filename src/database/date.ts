import {
  compareAsc,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  getDay,
  isToday,
  isTomorrow,
  isValid,
  isWithinInterval,
  parse,
} from 'date-fns';

export const DATE_KEY_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DEFAULT_TASK_TIME = '20:00';
export const DEFAULT_HABIT_TIME = '20:00';

export function getTodayDateKey(date = new Date()) {
  return format(date, DATE_KEY_FORMAT);
}

export function getTimestamp(date = new Date()) {
  return date.toISOString();
}

export function parseDateKey(dateKey: string) {
  return parse(dateKey, DATE_KEY_FORMAT, new Date());
}

export function parseDisplayDate(displayDate: string) {
  return parse(displayDate, DISPLAY_DATE_FORMAT, new Date());
}

export function parseTaskDateTime(dateKey: string, time: string) {
  return parse(`${dateKey} ${time}`, `${DATE_KEY_FORMAT} ${TIME_FORMAT}`, new Date());
}

export function normalizeTaskTime(time?: string | null) {
  const trimmed = time?.trim();

  if (!trimmed) {
    return DEFAULT_TASK_TIME;
  }

  return trimmed;
}

export function isDateKeyValid(dateKey: string) {
  const parsed = parseDateKey(dateKey);

  return isValid(parsed) && format(parsed, DATE_KEY_FORMAT) === dateKey;
}

export function formatDateKeyForDisplay(dateKey: string) {
  if (!isDateKeyValid(dateKey)) {
    return dateKey;
  }

  return format(parseDateKey(dateKey), DISPLAY_DATE_FORMAT);
}

export function parseDisplayDateToDateKey(displayDate: string) {
  const trimmed = displayDate.trim();
  const parsed = parseDisplayDate(trimmed);

  if (!isValid(parsed) || format(parsed, DISPLAY_DATE_FORMAT) !== trimmed) {
    return null;
  }

  return format(parsed, DATE_KEY_FORMAT);
}

export function maskDisplayDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isTaskTimeValid(time: string) {
  const parsed = parseTaskDateTime(getTodayDateKey(), time);

  return isValid(parsed) && format(parsed, TIME_FORMAT) === time;
}

export function maskTaskTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isTaskPastDueToday(dateKey: string, time: string, now = new Date()) {
  const dueAt = parseTaskDateTime(dateKey, time);

  return isToday(parseDateKey(dateKey)) && compareAsc(dueAt, now) === -1;
}

export function getTaskDueLabel(dateKey: string, time: string, now = new Date()) {
  if (isTaskPastDueToday(dateKey, time, now)) {
    return `Prazo passou às ${time}`;
  }

  return `Prazo ${time}`;
}

export type TaskDateGroupKey = 'today' | 'tomorrow' | 'thisWeek' | 'later';

export function getTaskDateGroup(dateKey: string, now = new Date()): TaskDateGroupKey {
  const date = parseDateKey(dateKey);

  if (isToday(date)) {
    return 'today';
  }

  if (isTomorrow(date)) {
    return 'tomorrow';
  }

  if (isWithinInterval(date, { start: now, end: endOfWeek(now, { weekStartsOn: 1 }) })) {
    return 'thisWeek';
  }

  return 'later';
}

export function getWeekdayIndex(date = new Date()) {
  return getDay(date);
}

export function getMonthDay(date = new Date()) {
  return getDate(date);
}

export function isLastDayOfMonth(date = new Date()) {
  return getDate(date) === getDate(endOfMonth(date));
}
