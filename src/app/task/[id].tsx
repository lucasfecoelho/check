import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppScreen, AppText, BackButton, Card, EmptyState, TaskForm } from '@/components';
import {
  deleteTask,
  getCategories,
  getSettings,
  getTaskById,
  initDatabase,
  updateTask,
  type Category,
  type TaskWithCategory,
  type UpdateTaskInput,
} from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

export default function TaskDetailsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [task, setTask] = useState<TaskWithCategory | null>(null);
  const [defaultTime, setDefaultTime] = useState('20:00');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTask() {
      if (!id) {
        return;
      }

      await initDatabase();
      const [loadedCategories, loadedTask, settings] = await Promise.all([
        getCategories(),
        getTaskById(id),
        getSettings(),
      ]);
      const defaultTaskTime = settings.find((setting) => setting.key === 'default_task_time')?.value;

      setCategories(loadedCategories);
      setTask(loadedTask);
      setDefaultTime(defaultTaskTime ?? '20:00');
      setIsLoading(false);
    }

    loadTask().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir a tarefa.');
      setIsLoading(false);
    });
  }, [id]);

  async function handleUpdateTask(values: UpdateTaskInput) {
    if (!id) {
      return;
    }

    await updateTask(id, values);
    router.replace('/tasks');
  }

  function handleDeleteTask() {
    if (!id) {
      return;
    }

    Alert.alert('Excluir tarefa?', 'Deseja excluir esta tarefa?', [
      {
        style: 'cancel',
        text: 'Cancelar',
      },
      {
        onPress: () => {
          deleteTask(id)
            .then(() => router.replace('/tasks'))
            .catch(console.error);
        },
        style: 'destructive',
        text: 'Excluir',
      },
    ]);
  }

  if (!isLoading && (!task || error)) {
    return (
      <AppScreen>
        <EmptyState
          description={error ?? 'Ela pode ter sido excluída ou removida por limpeza.'}
          icon={Trash2}
          title="Tarefa não encontrada"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Editar tarefa</AppText>
        <AppText color={colors.textMuted}>Atualize título, categoria, data ou horário.</AppText>
      </View>

      {task ? (
        <TaskForm
          categories={categories}
          defaultTime={defaultTime}
          initialValues={task}
          onSubmit={handleUpdateTask}
          submitLabel="Salvar alterações"
        />
      ) : null}

      {task ? (
        <Card style={styles.dangerCard}>
          <View style={styles.deleteCopy}>
            <AppText variant="bodyStrong">Excluir tarefa?</AppText>
            <AppText color={colors.textMuted}>Deseja excluir esta tarefa?</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleDeleteTask}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.dangerSoft },
              pressed && styles.pressed,
            ]}>
            <Trash2 color={colors.danger} size={18} strokeWidth={2.2} />
            <AppText color={colors.danger} variant="bodyStrong">
              Excluir
            </AppText>
          </Pressable>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  dangerCard: {
    gap: spacing.lg,
  },
  deleteCopy: {
    gap: spacing.xs,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
