import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen, AppText, BackButton, TaskForm } from '@/components';
import {
  createTask,
  getCategories,
  getSettings,
  initDatabase,
  type Category,
  type CreateTaskInput,
} from '@/database';
import { colors, spacing } from '@/theme';

export default function NewTaskScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultTime, setDefaultTime] = useState('20:00');

  useEffect(() => {
    async function loadCategories() {
      await initDatabase();
      const [loadedCategories, settings] = await Promise.all([getCategories(), getSettings()]);
      const defaultTaskTime = settings.find((setting) => setting.key === 'default_task_time')?.value;

      setCategories(loadedCategories);
      setDefaultTime(defaultTaskTime ?? '20:00');
    }

    loadCategories().catch(console.error);
  }, []);

  async function handleCreateTask(values: CreateTaskInput) {
    await createTask(values);
    router.replace('/tasks');
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Nova tarefa</AppText>
        <AppText color={colors.textMuted}>
          Crie uma tarefa pontual com data e horário.
        </AppText>
      </View>

      <TaskForm
        categories={categories}
        defaultTime={defaultTime}
        onSubmit={handleCreateTask}
        submitLabel="Salvar tarefa"
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
});
