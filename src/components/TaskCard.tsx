import { CheckCircle2, Clock3 } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import type { TaskWithCategory } from '@/database';
import { formatDateKeyForDisplay, getTaskDueLabel, isTaskPastDueToday } from '@/database/date';
import { radius, spacing, useThemeColors } from '@/theme';

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
  const colors = useThemeColors();
  const checkScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const completed = task.status === 'completed';
  const isPastDue = !completed && isTaskPastDueToday(task.date, task.time);
  const dueLabel = getTaskDueLabel(task.date, task.time);

  function handleCompletePress() {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(checkScale, {
          duration: 90,
          toValue: 1.12,
          useNativeDriver: true,
        }),
        Animated.timing(checkScale, {
          duration: 120,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(glowOpacity, {
          duration: 80,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          duration: 150,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onComplete?.(task.id));
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(task.id)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card
        style={[
          styles.card,
          { borderColor: `${task.category_color}24` },
          isPastDue && { borderColor: colors.dangerSoft },
          completed && {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.successSoft,
            opacity: 0.86,
          },
        ]}>
        <View style={styles.row}>
          <View
            style={[
              styles.accent,
              { backgroundColor: isPastDue ? colors.warning : task.category_color },
              completed && { backgroundColor: colors.success },
            ]}
          />
          <View style={[styles.categoryIcon, { backgroundColor: `${task.category_color}18` }]}>
            <CategoryIcon color={task.category_color} name={task.category_icon} size={20} />
          </View>

          <View style={styles.content}>
            <AppText
              color={completed ? colors.textMuted : colors.text}
              numberOfLines={2}
              style={completed && styles.completedText}
              variant="bodyStrong">
              {task.title}
            </AppText>

            <View style={styles.metaRow}>
              <CategoryBadge
                color={task.category_color}
                icon={task.category_icon}
                label={task.category_name}
              />

              <View
                style={[
                  styles.dueChip,
                  { backgroundColor: colors.surfaceMuted },
                  isPastDue && { backgroundColor: colors.dangerSoft },
                ]}>
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
              onPress={handleCompletePress}
              style={({ pressed }) => [styles.completeButton, pressed && styles.pressed]}>
              <Animated.View
                style={[
                  styles.checkGlow,
                  { backgroundColor: colors.taskSoft, opacity: glowOpacity },
                ]}
              />
              <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <CheckCircle2 color={colors.task} size={24} strokeWidth={2.2} />
              </Animated.View>
            </Pressable>
          ) : null}

          {completed && !onComplete ? (
            <CheckCircle2 color={colors.success} size={24} strokeWidth={2.2} />
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
  card: {
    overflow: 'hidden',
    paddingLeft: spacing.xl,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  accent: {
    bottom: 0,
    left: -spacing.xl,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dueChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  pastDueChip: {
  },
  completeButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  checkGlow: {
    borderRadius: radius.xl,
    height: 34,
    position: 'absolute',
    width: 34,
  },
});
