import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, CheckCircle2, ListTodo, Plus, Repeat2, Target } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import {
  AppScreen,
  AppText,
  EmptyState,
  HabitCard,
  OverdueTasksReviewCard,
  SectionHeader,
  SleepCard,
  TaskCard,
} from '@/components';
import {
  addHabitProgressForToday,
  completeHabitForToday,
  completeTask,
  deleteTask,
  deleteHabitCompletionForToday,
  getSettings,
  getOldPendingTasks,
  getTodaySleepEntry,
  getTodayCompletedTasks,
  getTodayHabits,
  getTodayTasks,
  initDatabase,
  saveSleepEntry,
  type SleepEntry,
  type TaskWithCategory,
  type TodayHabit,
} from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

function formatToday() {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const trimmedName = name.trim();

  return trimmedName ? `${greeting}, ${trimmedName}` : greeting;
}

function animateNextLayoutChange() {
  LayoutAnimation.configureNext({
    duration: 180,
    create: {
      duration: 170,
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      duration: 150,
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    update: {
      duration: 180,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  });
}

export default function TodayScreen() {
  console.log('[Check][Today] render');
  const colors = useThemeColors();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithCategory[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskWithCategory[]>([]);
  const [oldPendingTasks, setOldPendingTasks] = useState<TaskWithCategory[]>([]);
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [sleepEntry, setSleepEntry] = useState<SleepEntry | null>(null);
  const [profileName, setProfileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pendingHabits = useMemo(() => habits.filter((habit) => !habit.is_completed), [habits]);
  const completedHabits = useMemo(() => habits.filter((habit) => habit.is_completed), [habits]);
  const totalTodayItems = tasks.length + completedTasks.length + habits.length + 1;
  const completedTodayItems = completedTasks.length + completedHabits.length + (sleepEntry ? 1 : 0);
  const progressPercent = totalTodayItems
    ? Math.round((completedTodayItems / totalTodayItems) * 100)
    : 0;
  const progressSummary =
    totalTodayItems > 0
      ? `${completedTodayItems} de ${totalTodayItems} itens concluídos`
      : 'Nenhum item planejado para hoje';
  const progressMessage =
    totalTodayItems === 0
      ? 'Dia leve para respirar, revisar ou criar uma pequena rotina.'
      : progressPercent === 100
        ? 'Rotina do dia fechada. Belo ritmo.'
        : completedTodayItems > 0
          ? 'Você já começou. Continue no próximo passo possível.'
          : 'Comece por um item pequeno para ganhar tração.';

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const loadToday = useCallback(async (animateLayout = false) => {
    console.log('[Check][Today] load start');
    setIsLoading(true);

    try {
      console.log('[Check][Today] before database init');
      await initDatabase();
      console.log('[Check][Today] after database init');

      const [todayTasks, todayCompletedTasks, oldTasks, todayHabits, todaySleepEntry, settings] =
        await Promise.all([
          getTodayTasks(),
          getTodayCompletedTasks(),
          getOldPendingTasks(),
          getTodayHabits(),
          getTodaySleepEntry(),
          getSettings(),
        ]);

      console.log(
        `[Check][Today] loaded ${todayTasks.length} pending tasks, ${todayCompletedTasks.length} completed tasks, ${oldTasks.length} old pending tasks and ${todayHabits.length} habits`
      );

      if (animateLayout) {
        animateNextLayoutChange();
      }

      setTasks(todayTasks);
      setCompletedTasks(todayCompletedTasks);
      setOldPendingTasks(oldTasks);
      setHabits(todayHabits);
      setSleepEntry(todaySleepEntry);
      setProfileName(settings.find((setting) => setting.key === 'profile_name')?.value ?? '');
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
    await loadToday(true);
  }

  async function handleIgnoreOldTask(id: string) {
    await deleteTask(id);
    await loadToday(true);
  }

  async function handleCompleteHabit(id: string) {
    await completeHabitForToday(id);
    await loadToday(true);
  }

  async function handleUndoHabit(id: string) {
    await deleteHabitCompletionForToday(id);
    await loadToday(true);
  }

  async function handleAddHabitProgress(id: string, amount: number) {
    await addHabitProgressForToday(id, amount);
    await loadToday(true);
  }

  async function handleSaveSleep(hours: number) {
    await saveSleepEntry({ hours });
    await loadToday(true);
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText color={colors.textMuted} variant="caption">
            {getGreeting(profileName)}
          </AppText>
          <AppText variant="heading">Sua rotina de hoje</AppText>
          <View style={styles.headerMeta}>
            <View style={[styles.datePill, { backgroundColor: colors.primarySoft }]}>
              <CalendarDays color={colors.primary} size={14} strokeWidth={2.3} />
              <AppText color={colors.primary} variant="caption">
                {formatToday()}
              </AppText>
            </View>
            <AppText color={colors.textMuted} variant="caption">
              {progressSummary}
            </AppText>
          </View>
        </View>
        <View style={[styles.logoMark, { backgroundColor: colors.primarySoft }]}>
          <Target color={colors.primary} size={28} strokeWidth={2.4} />
        </View>
      </View>

      <View
        style={[
          styles.progressPanel,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.primaryDark,
          },
        ]}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleRow}>
            <View style={[styles.progressIcon, { backgroundColor: colors.successSoft }]}>
              <CheckCircle2 color={colors.success} size={18} strokeWidth={2.4} />
            </View>
            <View style={styles.progressCopy}>
              <AppText variant="bodyStrong">Progresso do dia</AppText>
              <AppText color={colors.textMuted} variant="caption">
                {progressMessage}
              </AppText>
            </View>
          </View>
          <AppText color={colors.primary} variant="title">
            {progressPercent}%
          </AppText>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: progressPercent === 100 ? colors.success : colors.primary,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.statItem}>
            <AppText variant="title">{completedTodayItems}</AppText>
            <AppText color={colors.textMuted} variant="caption">
              concluídos
            </AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <AppText variant="title">{totalTodayItems}</AppText>
            <AppText color={colors.textMuted} variant="caption">
              no plano
            </AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <AppText variant="title">{pendingHabits.length}</AppText>
            <AppText color={colors.textMuted} variant="caption">
              hábitos pendentes
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/task/new')}
          style={({ pressed }) => [
            styles.quickAction,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}>
          <Plus color={colors.onPrimary} size={18} strokeWidth={2.4} />
          <AppText color={colors.onPrimary} variant="bodyStrong">
            Tarefa
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/habit/new')}
          style={({ pressed }) => [
            styles.quickActionSecondary,
            { backgroundColor: colors.habitSoft },
            pressed && styles.pressed,
          ]}>
          <Repeat2 color={colors.habit} size={18} strokeWidth={2.4} />
          <AppText color={colors.habit} variant="bodyStrong">
            Hábito
          </AppText>
        </Pressable>
      </View>

      <OverdueTasksReviewCard
        onComplete={handleCompleteTask}
        onIgnore={handleIgnoreOldTask}
        tasks={oldPendingTasks}
      />

      <View style={styles.section}>
        <SectionHeader
          count={sleepEntry ? 1 : 0}
          subtitle="Registro diario de descanso"
          title="Sono"
        />
        <SleepCard entry={sleepEntry} onSave={handleSaveSleep} />
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
            iconBackgroundColor={colors.taskSoft}
            iconColor={colors.task}
            title="Hoje está leve"
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader count={pendingHabits.length} subtitle="Rotinas que caem no dia" title="Hábitos de hoje" />
        <View style={styles.list}>
          {pendingHabits.map((habit) => (
            <HabitCard
              habit={habit}
              key={habit.id}
              onAddProgress={handleAddHabitProgress}
              onComplete={handleCompleteHabit}
            />
          ))}
        </View>
        {!isLoading && pendingHabits.length === 0 ? (
          <EmptyState
            description="Nenhum hábito pendente para hoje."
            icon={Repeat2}
            iconBackgroundColor={colors.habitSoft}
            iconColor={colors.habit}
            title="Tudo certo por aqui"
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader
          count={completedTasks.length + completedHabits.length}
          subtitle="Tarefas e hábitos finalizados hoje"
          title="Concluídos hoje"
        />
        <View style={styles.list}>
          {completedTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {completedHabits.map((habit) => (
            <HabitCard habit={habit} key={habit.id} onUndo={handleUndoHabit} />
          ))}
        </View>
        {!isLoading && completedTasks.length === 0 && completedHabits.length === 0 ? (
          <EmptyState
            description="Quando concluir algo hoje, ele continua aqui."
            icon={CheckCircle2}
            iconBackgroundColor={colors.successSoft}
            iconColor={colors.success}
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
    flex: 1,
    gap: spacing.sm,
  },
  headerMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  datePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  logoMark: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  progressPanel: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  progressHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  progressTitleRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  progressIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  progressCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  progressTrack: {
    borderRadius: radius.md,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.md,
    height: '100%',
    minWidth: 0,
  },
  progressStats: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  statDivider: {
    marginHorizontal: spacing.md,
    width: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
  },
  quickActionSecondary: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
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
