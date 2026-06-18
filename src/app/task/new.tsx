import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppScreen, AppText, BackButton, Card, TaskForm } from '@/components';
import {
  archiveNotebookEntry,
  createTask,
  getCategories,
  getSettings,
  initDatabase,
  type Category,
  type CreateTaskInput,
} from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

type TaskCreationParams = {
  notebookEntryId?: string | string[];
  title?: string | string[];
};

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewTaskScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams<TaskCreationParams>();
  const sourceNotebookEntryId = getSingleParam(params.notebookEntryId);
  const sourceTitle = getSingleParam(params.title);
  const [categories, setCategories] = useState<Category[]>([]);
  const [defaultTime, setDefaultTime] = useState('20:00');
  const [archiveSourceAfterCreate, setArchiveSourceAfterCreate] = useState(false);

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
    const task = await createTask(values);

    if (!task) {
      throw new Error('Não foi possível criar a tarefa.');
    }

    if (sourceNotebookEntryId && archiveSourceAfterCreate) {
      await archiveNotebookEntry(sourceNotebookEntryId);
    }

    router.replace('/tasks');
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Nova tarefa</AppText>
        <AppText color={colors.textMuted}>
          {sourceNotebookEntryId
            ? 'Complete data, horário e categoria antes de salvar.'
            : 'Crie uma tarefa pontual com data e horário.'}
        </AppText>
      </View>

      {sourceNotebookEntryId ? (
        <Card style={styles.sourceCard}>
          <View style={styles.sourceCopy}>
            <AppText variant="bodyStrong">Criada a partir do Caderno</AppText>
            <AppText color={colors.textMuted}>
              O título veio da anotação. O conteúdo original continua guardado no Caderno.
            </AppText>
          </View>

          <View style={styles.archiveRow}>
            <View style={styles.archiveCopy}>
              <AppText variant="bodyStrong">Arquivar anotação depois de salvar</AppText>
              <AppText color={colors.textMuted} variant="caption">
                Opcional — a anotação não será excluída.
              </AppText>
            </View>
            <Switch
              onValueChange={setArchiveSourceAfterCreate}
              thumbColor={archiveSourceAfterCreate ? colors.primary : colors.textSoft}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              value={archiveSourceAfterCreate}
            />
          </View>
        </Card>
      ) : null}

      <TaskForm
        categories={categories}
        defaultTime={defaultTime}
        initialValues={sourceTitle ? { title: sourceTitle } : undefined}
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
  sourceCard: {
    gap: spacing.lg,
  },
  sourceCopy: {
    gap: spacing.xs,
  },
  archiveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  archiveCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  sourceBadge: {
    borderRadius: radius.md,
  },
});
