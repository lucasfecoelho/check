import type { SQLiteDatabase } from 'expo-sqlite';

import { colors } from '@/theme/colors';

import { getTimestamp } from './date';
import type { Category, Setting } from './types';

type DefaultCategory = Omit<Category, 'created_at'>;

export const defaultCategories: DefaultCategory[] = [
  {
    color: colors.categoryRose,
    icon: 'User',
    id: 'category-personal',
    name: 'Pessoal',
  },
  {
    color: colors.categoryPurple,
    icon: 'Briefcase',
    id: 'category-work',
    name: 'Trabalho',
  },
  {
    color: colors.categoryBlue,
    icon: 'GraduationCap',
    id: 'category-college',
    name: 'Faculdade',
  },
  {
    color: colors.categoryGreen,
    icon: 'Wallet',
    id: 'category-finance',
    name: 'Financeiro',
  },
  {
    color: colors.categoryOrange,
    icon: 'Home',
    id: 'category-home',
    name: 'Casa',
  },
  {
    color: colors.categoryYellow,
    icon: 'ShoppingCart',
    id: 'category-shopping',
    name: 'Compras',
  },
  {
    color: colors.categoryGray,
    icon: 'Pin',
    id: 'category-other',
    name: 'Outros',
  },
];

export const defaultSettings: Setting[] = [
  {
    key: 'default_task_time',
    value: '20:00',
  },
  {
    key: 'notifications_enabled',
    value: 'true',
  },
  {
    key: 'profile_avatar_uri',
    value: '',
  },
  {
    key: 'profile_name',
    value: '',
  },
  {
    key: 'sleep_tracking_enabled',
    value: 'true',
  },
  {
    key: 'task_reminder_lead_minutes',
    value: '30',
  },
  {
    key: 'theme',
    value: 'light',
  },
];

export async function seedDefaultCategories(db: SQLiteDatabase) {
  const createdAt = getTimestamp();

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const category of defaultCategories) {
      await txn.runAsync(
        `
        INSERT OR IGNORE INTO categories (id, name, icon, color, created_at)
        VALUES (?, ?, ?, ?, ?);
        `,
        [category.id, category.name, category.icon, category.color, createdAt]
      );
    }
  });
}

export async function seedDefaultSettings(db: SQLiteDatabase) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const setting of defaultSettings) {
      await txn.runAsync(
        `
        INSERT OR IGNORE INTO settings (key, value)
        VALUES (?, ?);
        `,
        [setting.key, setting.value]
      );
    }
  });
}
