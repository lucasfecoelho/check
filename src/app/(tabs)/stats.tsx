import { useFocusEffect } from 'expo-router';
import {
  AlertCircle,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Flame,
  Moon,
  Repeat2,
  Sparkles,
  Trophy,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppScreen, AppText, Card, CategoryIcon, EmptyState, SectionHeader } from '@/components';
import {
  getRoutineStatistics,
  initDatabase,
  type RoutineHabitStatistic,
  type RoutineStatistics,
  type RoutineWeekHabitHighlight,
} from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatHours(value: number | null) {
  return typeof value === 'number' ? `${value}h` : '--';
}

function getWeekMessage(percent: number) {
  if (percent >= 80) {
    return `Voce concluiu ${formatPercent(percent)} da sua rotina esta semana`;
  }

  if (percent > 0) {
    return `${formatPercent(percent)} da rotina concluida nesta semana`;
  }

  return 'Ainda nao ha conclusoes registradas nesta semana';
}

function ProgressBar({ color, percent }: { color: string; percent: number }) {
  const colors = useThemeColors();

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.progressFill, { backgroundColor: color, width: `${percent}%` }]} />
    </View>
  );
}

function MetricCard({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number | string;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surfaceMuted }]}>
      <AppText color={color} variant="title">
        {value}
      </AppText>
      <AppText color={colors.textMuted} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

function HabitHighlight({
  highlight,
  tone,
  title,
}: {
  highlight: RoutineWeekHabitHighlight;
  tone: 'best' | 'weak';
  title: string;
}) {
  const colors = useThemeColors();
  const isBest = tone === 'best';

  return (
    <View
      style={[
        styles.highlightBox,
        { backgroundColor: isBest ? colors.successSoft : colors.warningSoft },
      ]}>
      <View style={styles.highlightIcon}>
        {isBest ? (
          <Trophy color={colors.success} size={17} strokeWidth={2.4} />
        ) : (
          <AlertCircle color={colors.warning} size={17} strokeWidth={2.4} />
        )}
      </View>
      <View style={styles.highlightCopy}>
        <AppText color={colors.textMuted} variant="caption">
          {title}
        </AppText>
        <AppText variant="bodyStrong">
          {highlight?.title ?? 'Sem dados suficientes'}
        </AppText>
        {highlight ? (
          <AppText color={colors.textMuted} variant="caption">
            {highlight.completedCount} de {highlight.expectedCount} conclusoes
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function HabitStatisticCard({ habit }: { habit: RoutineHabitStatistic }) {
  const colors = useThemeColors();
  const statusColor =
    habit.percent >= 80 ? colors.success : habit.percent < 50 ? colors.warning : colors.primary;

  return (
    <Card style={[styles.habitCard, { borderColor: `${habit.categoryColor}24` }]}>
      <View style={[styles.habitAccent, { backgroundColor: habit.categoryColor }]} />
      <View style={styles.habitHeader}>
        <View style={[styles.habitIcon, { backgroundColor: `${habit.categoryColor}16` }]}>
          <CategoryIcon color={habit.categoryColor} name={habit.categoryIcon} size={20} />
        </View>
        <View style={styles.habitTitle}>
          <AppText variant="bodyStrong">{habit.title}</AppText>
          <AppText color={colors.textMuted} variant="caption">
            {habit.completedCount} conclusoes no mes
          </AppText>
        </View>
        <AppText color={statusColor} variant="title">
          {formatPercent(habit.percent)}
        </AppText>
      </View>

      <ProgressBar color={statusColor} percent={habit.percent} />

      <View style={styles.chipRow}>
        <View style={[styles.statChip, { backgroundColor: colors.warningSoft }]}>
          <Flame color={colors.warning} size={13} strokeWidth={2.4} />
          <AppText color={colors.warning} variant="caption">
            {habit.currentStreak} dias
          </AppText>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.primarySoft }]}>
          <Trophy color={colors.primary} size={13} strokeWidth={2.4} />
          <AppText color={colors.primary} variant="caption">
            Melhor {habit.bestStreak}
          </AppText>
        </View>
        <View style={[styles.statChip, { backgroundColor: colors.surfaceMuted }]}>
          <CheckCircle2 color={colors.textMuted} size={13} strokeWidth={2.4} />
          <AppText color={colors.textMuted} variant="caption">
            {habit.completedCount}/{habit.expectedCount}
          </AppText>
        </View>
      </View>

      <View style={[styles.suggestionBox, { backgroundColor: colors.surfaceMuted }]}>
        <Sparkles color={statusColor} size={15} strokeWidth={2.3} />
        <AppText color={colors.textMuted} style={styles.suggestionText} variant="caption">
          {habit.suggestion}
        </AppText>
      </View>
    </Card>
  );
}

export default function StatsScreen() {
  const colors = useThemeColors();
  const [statistics, setStatistics] = useState<RoutineStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatistics = useCallback(async () => {
    setIsLoading(true);
    await initDatabase();
    const nextStatistics = await getRoutineStatistics();
    setStatistics(nextStatistics);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatistics().catch((error) => {
        console.error('[Check][statistics] Failed to load statistics', error);
        setIsLoading(false);
      });
    }, [loadStatistics])
  );

  if (isLoading && !statistics) {
    return (
      <AppScreen contentStyle={styles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
        <AppText color={colors.textMuted}>Carregando estatisticas...</AppText>
      </AppScreen>
    );
  }

  if (!statistics) {
    return (
      <AppScreen>
        <EmptyState
          description="Assim que houver habitos ou tarefas concluidas, os dados aparecem aqui."
          icon={BarChart3}
          title="Sem estatisticas ainda"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <AppText color={colors.textMuted} variant="caption">
          Consistencia
        </AppText>
        <AppText variant="heading">Estatisticas</AppText>
        <AppText color={colors.textMuted}>
          Um resumo simples para entender o que esta andando bem e o que merece atencao.
        </AppText>
      </View>

      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
            <BarChart3 color={colors.primary} size={22} strokeWidth={2.4} />
          </View>
          <View style={styles.heroCopy}>
            <AppText variant="bodyStrong">{getWeekMessage(statistics.week.percent)}</AppText>
            <AppText color={colors.textMuted} variant="caption">
              {statistics.week.comparisonMessage}
            </AppText>
          </View>
          <AppText color={colors.primary} variant="heading">
            {formatPercent(statistics.week.percent)}
          </AppText>
        </View>

        <ProgressBar color={colors.primary} percent={statistics.week.percent} />

        <View style={styles.metricsGrid}>
          <MetricCard
            color={colors.success}
            label="concluidos"
            value={statistics.week.completedItems}
          />
          <MetricCard
            color={colors.primary}
            label="previstos"
            value={statistics.week.expectedItems}
          />
        </View>

        <View style={styles.highlightsGrid}>
          <HabitHighlight highlight={statistics.week.bestHabit} title="Melhor habito" tone="best" />
          <HabitHighlight
            highlight={statistics.week.weakHabit}
            title="Mais dificil"
            tone="weak"
          />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader subtitle="Ate hoje, sem contar dias futuros" title="Resumo do mes" />
        <Card style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <View style={[styles.heroIcon, { backgroundColor: colors.habitSoft }]}>
              <CalendarCheck2 color={colors.habit} size={21} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <AppText variant="bodyStrong">{formatPercent(statistics.month.percent)} do mes</AppText>
              <AppText color={colors.textMuted} variant="caption">
                {statistics.month.completedItems} de {statistics.month.expectedItems} itens
              </AppText>
            </View>
          </View>

          <ProgressBar color={colors.habit} percent={statistics.month.percent} />

          <View style={styles.dayColors}>
            <MetricCard color={colors.success} label="dias verdes" value={statistics.month.greenDays} />
            <MetricCard color={colors.warning} label="dias amarelos" value={statistics.month.yellowDays} />
            <MetricCard color={colors.danger} label="dias vermelhos" value={statistics.month.redDays} />
          </View>

          <View style={styles.monthTotals}>
            <View style={[styles.totalRow, { borderColor: colors.border }]}>
              <Repeat2 color={colors.habit} size={17} strokeWidth={2.3} />
              <AppText style={styles.totalText} variant="bodyStrong">
                {statistics.month.completedHabits} habitos concluidos
              </AppText>
            </View>
            <View style={[styles.totalRow, { borderColor: colors.border }]}>
              <CheckCircle2 color={colors.task} size={17} strokeWidth={2.3} />
              <AppText style={styles.totalText} variant="bodyStrong">
                {statistics.month.completedTasks} tarefas concluidas
              </AppText>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader subtitle="Registros salvos por data" title="Sono" />
        <Card style={styles.sleepCard}>
          <View style={styles.monthHeader}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
              <Moon color={colors.primary} size={21} strokeWidth={2.4} />
            </View>
            <View style={styles.heroCopy}>
              <AppText variant="bodyStrong">Resumo de descanso</AppText>
              <AppText color={colors.textMuted} variant="caption">
                {statistics.sleep.week.recordedDays} registros nesta semana
              </AppText>
            </View>
          </View>

          <View style={styles.dayColors}>
            <MetricCard
              color={colors.primary}
              label="media semanal"
              value={formatHours(statistics.sleep.week.averageHours)}
            />
            <MetricCard
              color={colors.habit}
              label="media mensal"
              value={formatHours(statistics.sleep.month.averageHours)}
            />
          </View>

          <View style={styles.monthTotals}>
            <View style={[styles.totalRow, { borderColor: colors.border }]}>
              <Moon color={colors.success} size={17} strokeWidth={2.3} />
              <AppText style={styles.totalText} variant="bodyStrong">
                Melhor noite: {formatHours(statistics.sleep.month.bestNight?.hours ?? null)}
              </AppText>
            </View>
            <View style={[styles.totalRow, { borderColor: colors.border }]}>
              <Moon color={colors.warning} size={17} strokeWidth={2.3} />
              <AppText style={styles.totalText} variant="bodyStrong">
                Pior noite: {formatHours(statistics.sleep.month.worstNight?.hours ?? null)}
              </AppText>
            </View>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader
          count={statistics.habitStats.length}
          subtitle="Taxa mensal, sequencias e conclusoes"
          title="Por habito"
        />
        {statistics.habitStats.length > 0 ? (
          <View style={styles.habitList}>
            {statistics.habitStats.map((habit) => (
              <HabitStatisticCard habit={habit} key={habit.id} />
            ))}
          </View>
        ) : (
          <EmptyState
            description="Crie um habito e conclua alguns dias para acompanhar a consistencia."
            icon={Repeat2}
            iconBackgroundColor={colors.habitSoft}
            iconColor={colors.habit}
            title="Sem habitos no periodo"
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    gap: spacing.xs,
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  heroCopy: {
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
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    borderRadius: radius.lg,
    flex: 1,
    gap: spacing.xs,
    minHeight: 76,
    justifyContent: 'center',
    padding: spacing.md,
  },
  highlightsGrid: {
    gap: spacing.md,
  },
  highlightBox: {
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  highlightIcon: {
    paddingTop: spacing.xs,
  },
  highlightCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  monthCard: {
    gap: spacing.lg,
  },
  sleepCard: {
    gap: spacing.lg,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  dayColors: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  monthTotals: {
    gap: spacing.sm,
  },
  totalRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  totalText: {
    flex: 1,
  },
  habitList: {
    gap: spacing.md,
  },
  habitCard: {
    gap: spacing.md,
    overflow: 'hidden',
    paddingLeft: spacing.xl,
  },
  habitAccent: {
    bottom: 0,
    left: -spacing.xl,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  habitHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  habitIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  habitTitle: {
    flex: 1,
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  suggestionBox: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  suggestionText: {
    flex: 1,
  },
});
