import { CheckCircle2, Circle } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import type { HabitWithCategory, TodayHabit } from '@/database';
import { getHabitScheduleLabel } from '@/database/habitRules';
import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';
import { CategoryIcon } from './CategoryIcon';

type HabitCardProps = {
  habit: HabitWithCategory | TodayHabit;
  onComplete?: (id: string) => void;
  onPress?: (id: string) => void;
  onUndo?: (id: string) => void;
};

function isTodayHabit(habit: HabitWithCategory | TodayHabit): habit is TodayHabit {
  return 'is_completed' in habit;
}

export function HabitCard({ habit, onComplete, onPress, onUndo }: HabitCardProps) {
  const colors = useThemeColors();
  const checkScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const completed = isTodayHabit(habit) && habit.is_completed;

  function handleActionPress() {
    if (completed) {
      onUndo?.(habit.id);
      return;
    }

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
    ]).start(() => onComplete?.(habit.id));
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(habit.id)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card
        style={
          completed && {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.successSoft,
          }
        }>
        <View style={styles.row}>
          <View style={[styles.categoryIcon, { backgroundColor: `${habit.category_color}18` }]}>
            <CategoryIcon color={habit.category_color} name={habit.category_icon} size={20} />
          </View>

          <View style={styles.content}>
            <AppText
              color={completed ? colors.textMuted : colors.text}
              numberOfLines={2}
              style={completed && styles.completedText}
              variant="bodyStrong">
              {habit.title}
            </AppText>
            <View style={styles.metaRow}>
              <CategoryBadge
                color={habit.category_color}
                icon={habit.category_icon}
                label={habit.category_name}
              />
              <AppText
                color={colors.textMuted}
                style={[styles.scheduleChip, { backgroundColor: colors.surfaceMuted }]}
                variant="caption">
                {getHabitScheduleLabel(habit)}
              </AppText>
            </View>
          </View>

          {onComplete || onUndo ? (
            <Pressable
              accessibilityLabel={completed ? 'Desfazer conclusão' : 'Concluir hábito'}
              accessibilityRole="button"
              hitSlop={10}
              onPress={handleActionPress}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
              <Animated.View
                style={[
                  styles.checkGlow,
                  { backgroundColor: colors.habitSoft, opacity: glowOpacity },
                ]}
              />
              {completed ? (
                <CheckCircle2 color={colors.success} size={24} strokeWidth={2.2} />
              ) : (
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <Circle color={colors.habit} size={24} strokeWidth={2.2} />
                </Animated.View>
              )}
            </Pressable>
          ) : null}

          {completed && !onUndo ? (
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
  completedCard: {
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
  completedText: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scheduleChip: {
    borderRadius: radius.sm,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
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
