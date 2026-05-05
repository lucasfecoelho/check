import { CalendarClock, CheckCircle2, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TaskWithCategory } from '@/database';
import { formatDateKeyForDisplay } from '@/database/date';
import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';

type OverdueTasksReviewCardProps = {
  onComplete: (id: string) => void;
  onIgnore: (id: string) => void;
  tasks: TaskWithCategory[];
};

export function OverdueTasksReviewCard({
  onComplete,
  onIgnore,
  tasks,
}: OverdueTasksReviewCardProps) {
  const colors = useThemeColors();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card style={[styles.card, { borderColor: colors.taskSoft }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.taskSoft }]}>
          <CalendarClock color={colors.task} size={20} strokeWidth={2.3} />
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="bodyStrong">Você deixou algumas tarefas sem concluir.</AppText>
          <AppText color={colors.textMuted} variant="caption">
            Quer marcar alguma como concluída?
          </AppText>
        </View>
      </View>

      <View style={styles.list}>
        {tasks.map((task) => (
          <View key={task.id} style={[styles.taskRow, { borderTopColor: colors.border }]}>
            <View style={styles.taskCopy}>
              <AppText numberOfLines={2} variant="bodyStrong">
                {task.title}
              </AppText>
              <View style={styles.metaRow}>
                <CategoryBadge
                  color={task.category_color}
                  icon={task.category_icon}
                  label={task.category_name}
                />
                <AppText color={colors.textMuted} variant="caption">
                  {formatDateKeyForDisplay(task.date)} · {task.time}
                </AppText>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel={`Concluir tarefa antiga ${task.title}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => onComplete(task.id)}
                style={({ pressed }) => [
                  styles.completeButton,
                  { backgroundColor: colors.task },
                  pressed && styles.pressed,
                ]}>
                <CheckCircle2 color={colors.onPrimary} size={16} strokeWidth={2.4} />
                <AppText color={colors.onPrimary} variant="caption">
                  Concluir
                </AppText>
              </Pressable>
              <Pressable
                accessibilityLabel={`Ignorar tarefa antiga ${task.title}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => onIgnore(task.id)}
                style={({ pressed }) => [
                  styles.ignoreButton,
                  { backgroundColor: colors.surfaceMuted },
                  pressed && styles.pressed,
                ]}>
                <Trash2 color={colors.textMuted} size={16} strokeWidth={2.2} />
                <AppText color={colors.textMuted} variant="caption">
                  Ignorar
                </AppText>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  taskRow: {
    borderTopWidth: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  taskCopy: {
    gap: spacing.sm,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  completeButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  ignoreButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
