import { useFocusEffect, useRouter } from 'expo-router';
import { CheckCircle2, ListTodo, Plus, Repeat2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppScreen,
  AppText,
  EmptyState,
  HabitCard,
  SectionHeader,
  TaskCard,
} from '@/components';
import {
  completeHabitForToday,
  completeTask,
  deleteHabitCompletionForToday,
  getTodayHabits,
  getTodayTasks,
  initDatabase,
  type TaskWithCategory,
  type TodayHabit,
} from '@/database';
import { colors, radius, spacing } from '@/theme';

function formatToday() {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function TodayScreen() {
  console.log('[Check][Today] render');
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pendingHabits = useMemo(() => habits.filter((habit) => !habit.is_completed), [habits]);
  const completedHabits = useMemo(() => habits.filter((habit) => habit.is_completed), [habits]);

  const loadToday = useCallback(async () => {
    console.log('[Check][Today] load start');
    setIsLoading(true);

    try {
      console.log('[Check][Today] before database init');
      await initDatabase();
      console.log('[Check][Today] after database init');

      const [todayTasks, todayHabits] = await Promise.all([getTodayTasks(), getTodayHabits()]);

      console.log(
        `[Check][Today] loaded ${todayTasks.length} tasks and ${todayHabits.length} habits`
      );
      setTasks(todayTasks);
      setHabits(todayHabits);
    } catch (error) {
      console.error('[Check][Today] failed to load today data', error);
    } finally {
      setIsLoading(false);
      console.log('[Check][Today] load finished');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadToday().catch((error) => {
        console.error('[Check][Today] unhandled focus load error', error);
      });
    }, [loadToday])
  );

  async function handleCompleteTask(id: string) {
    await completeTask(id);
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
  }

  async function handleCompleteHabit(id: string) {
    await completeHabitForToday(id);
    await loadToday();
  }

  async function handleUndoHabit(id: string) {
    await deleteHabitCompletionForToday(id);
    await loadToday();
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="heading">Check</AppText>
          <View style={styles.datePill}>
            <AppText color={colors.primary} variant="caption">
              {formatToday()}
            </AppText>
          </View>
        </View>
        <View style={styles.logoMark}>
          <CheckCircle2 color={colors.primary} size={28} strokeWidth={2.4} />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/task/new')}
          style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
          <Plus color={colors.surface} size={18} strokeWidth={2.4} />
          <AppText color={colors.surface} variant="bodyStrong">
            Tarefa
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/habit/new')}
          style={({ pressed }) => [styles.quickActionSecondary, pressed && styles.pressed]}>
          <Repeat2 color={colors.primary} size={18} strokeWidth={2.4} />
          <AppText color={colors.primary} variant="bodyStrong">
            Hábito
          </AppText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeader count={tasks.length} subtitle="Pendentes e prazos do dia" title="Tarefas de hoje" />
        <View style={styles.list}>
          {tasks.map((task) => (
            <TaskCard key={task.id} onComplete={handleCompleteTask} task={task} />
          ))}
        </View>
        {!isLoading && tasks.length === 0 ? (
          <EmptyState
            description="Nenhuma tarefa pendente para hoje."
            icon={ListTodo}
            title="Hoje está leve"
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader count={pendingHabits.length} subtitle="Rotinas que caem no dia" title="Hábitos de hoje" />
        <View style={styles.list}>
          {pendingHabits.map((habit) => (
            <HabitCard habit={habit} key={habit.id} onComplete={handleCompleteHabit} />
          ))}
        </View>
        {!isLoading && pendingHabits.length === 0 ? (
          <EmptyState
            description="Nenhum hábito pendente para hoje."
            icon={Repeat2}
            title="Tudo certo por aqui"
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader count={completedHabits.length} subtitle="Concluídos no ciclo atual" title="Concluídos hoje" />
        <View style={styles.list}>
          {completedHabits.map((habit) => (
            <HabitCard habit={habit} key={habit.id} onUndo={handleUndoHabit} />
          ))}
        </View>
        {!isLoading && completedHabits.length === 0 ? (
          <EmptyState
            description="Quando concluir um hábito hoje, ele continua aqui."
            icon={CheckCircle2}
            title="Nada concluído ainda"
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerCopy: {
    gap: spacing.sm,
  },
  datePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  quickActionSecondary: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  pressed: {
    opacity: 0.76,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
