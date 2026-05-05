import { useFocusEffect, useRouter } from 'expo-router';
import { ListTodo, Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen, AppText, EmptyState, PrimaryButton, SectionHeader, TaskCard } from '@/components';
import { getUpcomingTasks, initDatabase, type TaskWithCategory } from '@/database';
import { getTaskDateGroup, type TaskDateGroupKey } from '@/database/date';
import { colors, spacing } from '@/theme';

const groups: { key: TaskDateGroupKey; title: string; subtitle: string }[] = [
  { key: 'today', title: 'Hoje', subtitle: 'Ainda aparecem mesmo com prazo passado' },
  { key: 'tomorrow', title: 'Amanhã', subtitle: 'Próximas 24 horas' },
  { key: 'thisWeek', title: 'Esta semana', subtitle: 'Até o fim da semana' },
  { key: 'later', title: 'Depois', subtitle: 'Sem pressa imediata' },
];

function groupTasks(tasks: TaskWithCategory[]) {
  return tasks.reduce<Record<TaskDateGroupKey, TaskWithCategory[]>>(
    (acc, task) => {
      acc[getTaskDateGroup(task.date)].push(task);
      return acc;
    },
    {
      later: [],
      thisWeek: [],
      today: [],
      tomorrow: [],
    }
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const groupedTasks = useMemo(() => groupTasks(tasks), [tasks]);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    await initDatabase();
    const upcomingTasks = await getUpcomingTasks();
    setTasks(upcomingTasks);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks().catch(console.error);
    }, [loadTasks])
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="heading">Tarefas</AppText>
          <AppText color={colors.textMuted}>
            Pontuais, com data e horário.
          </AppText>
        </View>
        <PrimaryButton icon={Plus} label="Nova" onPress={() => router.push('/task/new')} />
      </View>

      {!isLoading && tasks.length === 0 ? (
        <EmptyState
          description="Crie sua primeira tarefa para ela aparecer aqui e na tela Hoje."
          icon={ListTodo}
          title="Nenhuma tarefa cadastrada"
        />
      ) : null}

      {groups.map((group) => {
        const groupItems = groupedTasks[group.key];

        if (groupItems.length === 0) {
          return null;
        }

        return (
          <View key={group.key} style={styles.section}>
            <SectionHeader count={groupItems.length} subtitle={group.subtitle} title={group.title} />
            <View style={styles.list}>
              {groupItems.map((task) => (
                <TaskCard
                  key={task.id}
                  onPress={(id) => router.push({ pathname: '/task/[id]', params: { id } })}
                  showDate={group.key !== 'today'}
                  task={task}
                />
              ))}
            </View>
          </View>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
