import { CheckCircle2, Clock3 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TaskWithCategory } from '@/database';
import { formatDateKeyForDisplay, getTaskDueLabel, isTaskPastDueToday } from '@/database/date';
import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';
import { CategoryIcon } from './CategoryIcon';

type TaskCardProps = {
  onComplete?: (id: string) => void;
  onPress?: (id: string) => void;
  showDate?: boolean;
  task: TaskWithCategory;
};

export function TaskCard({ onComplete, onPress, showDate = false, task }: TaskCardProps) {
  const isPastDue = isTaskPastDueToday(task.date, task.time);
  const dueLabel = getTaskDueLabel(task.date, task.time);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(task.id)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={isPastDue && styles.pastDueCard}>
        <View style={styles.row}>
          <View style={[styles.categoryIcon, { backgroundColor: `${task.category_color}18` }]}>
            <CategoryIcon color={task.category_color} name={task.category_icon} size={20} />
          </View>

          <View style={styles.content}>
            <AppText numberOfLines={2} variant="bodyStrong">
              {task.title}
            </AppText>

            <View style={styles.metaRow}>
              <CategoryBadge
                color={task.category_color}
                icon={task.category_icon}
                label={task.category_name}
              />

              <View style={[styles.dueChip, isPastDue && styles.pastDueChip]}>
                <Clock3
                  color={isPastDue ? colors.danger : colors.textMuted}
                  size={13}
                  strokeWidth={2.2}
                />
                <AppText color={isPastDue ? colors.danger : colors.textMuted} variant="caption">
                  {dueLabel}
                </AppText>
              </View>

              {showDate ? (
                <AppText color={colors.textMuted} variant="caption">
                  {formatDateKeyForDisplay(task.date)}
                </AppText>
              ) : null}
            </View>
          </View>

          {onComplete ? (
            <Pressable
              accessibilityLabel="Concluir tarefa"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => onComplete(task.id)}
              style={({ pressed }) => [styles.completeButton, pressed && styles.pressed]}>
              <CheckCircle2 color={colors.primary} size={24} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
  },
  pastDueCard: {
    borderColor: colors.dangerSoft,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dueChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  pastDueChip: {
    backgroundColor: colors.dangerSoft,
  },
  completeButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
