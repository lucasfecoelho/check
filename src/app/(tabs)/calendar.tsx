import { useFocusEffect } from 'expo-router';
import { addMonths, startOfMonth, subMonths } from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ListChecks,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppScreen, AppText, Card, CategoryIcon } from '@/components';
import {
  getRoutineCalendarMonth,
  initDatabase,
  type RoutineCalendarDay,
  type RoutineCalendarDayStatus,
  type RoutineCalendarItem,
} from '@/database';
import { getTodayDateKey } from '@/database/date';
import { radius, spacing, useThemeColors } from '@/theme';

const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatMonthTitle(date: Date) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatSelectedDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getDefaultSelectedDate(monthDate: Date, days: RoutineCalendarDay[]) {
  const todayKey = getTodayDateKey();
  const todayInMonth = days.find((day) => day.dateKey === todayKey && day.isCurrentMonth);

  if (todayInMonth) {
    return todayInMonth.dateKey;
  }

  return days.find((day) => day.isCurrentMonth)?.dateKey ?? getTodayDateKey(monthDate);
}

function getStatusLabel(status: RoutineCalendarDayStatus) {
  if (status === 'complete') {
    return 'Tudo concluído';
  }

  if (status === 'partial') {
    return 'Parcial';
  }

  if (status === 'missed') {
    return 'Pendente';
  }

  if (status === 'future') {
    return 'Futuro';
  }

  return 'Sem plano';
}

function getDayTone(
  status: RoutineCalendarDayStatus,
  colors: ReturnType<typeof useThemeColors>
) {
  if (status === 'complete') {
    return {
      backgroundColor: colors.successSoft,
      borderColor: colors.success,
      textColor: colors.success,
    };
  }

  if (status === 'partial') {
    return {
      backgroundColor: colors.warningSoft,
      borderColor: colors.warning,
      textColor: colors.warning,
    };
  }

  if (status === 'missed') {
    return {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
      textColor: colors.danger,
    };
  }

  return {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    textColor: colors.textMuted,
  };
}

function SummaryList({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: RoutineCalendarItem[];
  title: string;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.summaryGroup}>
      <View style={styles.summaryGroupHeader}>
        <AppText variant="bodyStrong">{title}</AppText>
        <View style={[styles.countBadge, { backgroundColor: colors.surfaceMuted }]}>
          <AppText color={colors.textMuted} variant="caption">
            {items.length}
          </AppText>
        </View>
      </View>

      {items.length === 0 ? (
        <AppText color={colors.textMuted} variant="caption">
          {emptyText}
        </AppText>
      ) : (
        <View style={styles.itemList}>
          {items.map((item) => (
            <View key={`${item.type}-${item.id}`} style={styles.summaryItem}>
              {item.completed ? (
                <CheckCircle2 color={colors.success} size={18} strokeWidth={2.3} />
              ) : (
                <Circle color={colors.textMuted} size={18} strokeWidth={2.2} />
              )}
              <View style={styles.summaryItemCopy}>
                <AppText numberOfLines={2} variant="bodyStrong">
                  {item.title}
                </AppText>
                <View style={styles.itemMeta}>
                  <CategoryIcon color={item.category_color} name={item.category_icon} size={13} />
                  <AppText color={colors.textMuted} numberOfLines={1} variant="caption">
                    {item.category_name} · {item.time}
                  </AppText>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function CalendarScreen() {
  const colors = useThemeColors();
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<RoutineCalendarDay[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const selectedDay = useMemo(
    () => days.find((day) => day.dateKey === selectedDateKey) ?? null,
    [days, selectedDateKey]
  );

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    await initDatabase();
    const loadedDays = await getRoutineCalendarMonth(monthDate);

    setDays(loadedDays);
    setSelectedDateKey((currentDateKey) => {
      const currentStillVisible = loadedDays.some(
        (day) => day.dateKey === currentDateKey && day.isCurrentMonth
      );

      return currentStillVisible ? currentDateKey : getDefaultSelectedDate(monthDate, loadedDays);
    });
    setIsLoading(false);
  }, [monthDate]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar().catch((error) => {
        console.error('[Check][Calendar] failed to load calendar', error);
        setIsLoading(false);
      });
    }, [loadCalendar])
  );

  function handlePreviousMonth() {
    setMonthDate((currentMonth) => startOfMonth(subMonths(currentMonth, 1)));
  }

  function handleNextMonth() {
    setMonthDate((currentMonth) => startOfMonth(addMonths(currentMonth, 1)));
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="heading">Calendário</AppText>
          <AppText color={colors.textMuted}>
            Desempenho mensal de hábitos e tarefas.
          </AppText>
        </View>
        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityLabel="Mês anterior"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handlePreviousMonth}
            style={({ pressed }) => [
              styles.monthButton,
              { backgroundColor: colors.surfaceMuted },
              pressed && styles.pressed,
            ]}>
            <ChevronLeft color={colors.text} size={20} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.monthTitle}>
            <CalendarDays color={colors.primary} size={18} strokeWidth={2.4} />
            <AppText variant="title">{formatMonthTitle(monthDate)}</AppText>
          </View>

          <Pressable
            accessibilityLabel="Próximo mês"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleNextMonth}
            style={({ pressed }) => [
              styles.monthButton,
              { backgroundColor: colors.surfaceMuted },
              pressed && styles.pressed,
            ]}>
            <ChevronRight color={colors.text} size={20} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.weekdays}>
          {weekdayLabels.map((label, index) => (
            <AppText
              color={colors.textMuted}
              key={`${label}-${index}`}
              style={styles.weekdayLabel}
              variant="caption">
              {label}
            </AppText>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day) => {
            const tone = getDayTone(day.status, colors);
            const isSelected = selectedDateKey === day.dateKey;
            const isDisabled = !day.isCurrentMonth;

            return (
              <Pressable
                accessibilityLabel={`Ver resumo de ${formatSelectedDate(day.dateKey)}`}
                accessibilityRole="button"
                disabled={isDisabled}
                key={day.dateKey}
                onPress={() => setSelectedDateKey(day.dateKey)}
                style={({ pressed }) => [
                  styles.dayCell,
                  {
                    backgroundColor: tone.backgroundColor,
                    borderColor: isSelected ? colors.primary : tone.borderColor,
                    opacity: day.isCurrentMonth ? 1 : 0.34,
                  },
                  day.isToday && { borderColor: colors.primary },
                  isSelected && styles.selectedDay,
                  pressed && styles.pressed,
                ]}>
                <AppText
                  color={day.isCurrentMonth ? tone.textColor : colors.textSoft}
                  style={styles.dayNumber}
                  variant="bodyStrong">
                  {day.dayOfMonth}
                </AppText>
                {day.totalCount > 0 && !day.isFuture ? (
                  <AppText color={tone.textColor} style={styles.dayRatio} variant="caption">
                    {day.completedCount}/{day.totalCount}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          {(['complete', 'partial', 'missed', 'empty'] as RoutineCalendarDayStatus[]).map(
            (status) => {
              const tone = getDayTone(status, colors);

              return (
                <View key={status} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: tone.backgroundColor }]} />
                  <AppText color={colors.textMuted} variant="caption">
                    {getStatusLabel(status)}
                  </AppText>
                </View>
              );
            }
          )}
        </View>
      </Card>

      {selectedDay ? (
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}>
              <ListChecks color={colors.primary} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.summaryCopy}>
              <AppText variant="title">{formatSelectedDate(selectedDay.dateKey)}</AppText>
              <AppText color={colors.textMuted} variant="caption">
                {selectedDay.isFuture
                  ? 'Dia futuro'
                  : `${selectedDay.completedCount} de ${selectedDay.totalCount} itens concluídos`}
              </AppText>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: getDayTone(selectedDay.status, colors).backgroundColor },
              ]}>
              <AppText
                color={getDayTone(selectedDay.status, colors).textColor}
                variant="caption">
                {getStatusLabel(selectedDay.status)}
              </AppText>
            </View>
          </View>

          {selectedDay.totalCount === 0 || selectedDay.isFuture ? (
            <View style={[styles.emptySummary, { backgroundColor: colors.surfaceMuted }]}>
              <AppText color={colors.textMuted} variant="caption">
                {selectedDay.isFuture
                  ? 'Dias futuros ficam neutros até chegarem.'
                  : 'Nenhum hábito ou tarefa previsto para este dia.'}
              </AppText>
            </View>
          ) : (
            <View style={styles.summaryLists}>
              <SummaryList
                emptyText="Nenhum hábito concluído."
                items={selectedDay.habitsCompleted}
                title="Hábitos concluídos"
              />
              <SummaryList
                emptyText="Nenhum hábito pendente."
                items={selectedDay.habitsPending}
                title="Hábitos não concluídos"
              />
              <SummaryList
                emptyText="Nenhuma tarefa concluída."
                items={selectedDay.tasksCompleted}
                title="Tarefas concluídas"
              />
              <SummaryList
                emptyText="Nenhuma tarefa pendente."
                items={selectedDay.tasksPending}
                title="Tarefas pendentes"
              />
            </View>
          )}
        </Card>
      ) : null}
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
  calendarCard: {
    gap: spacing.lg,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  monthButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthTitle: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  weekdays: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '13.45%',
    flexGrow: 1,
    justifyContent: 'center',
    minWidth: 38,
  },
  selectedDay: {
    borderWidth: 2,
  },
  dayNumber: {
    textAlign: 'center',
  },
  dayRatio: {
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendDot: {
    borderRadius: radius.sm,
    height: 12,
    width: 12,
  },
  summaryCard: {
    gap: spacing.lg,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  statusPill: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emptySummary: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  summaryLists: {
    gap: spacing.lg,
  },
  summaryGroup: {
    gap: spacing.sm,
  },
  summaryGroupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: radius.sm,
    minWidth: 26,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  itemList: {
    gap: spacing.sm,
  },
  summaryItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryItemCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  itemMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
