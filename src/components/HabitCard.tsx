import { CheckCircle2, Circle, Flame, Gauge, Trophy } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { HabitWithCategory, TodayHabit } from '@/database';
import { getHabitScheduleLabel } from '@/database/habitRules';
import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryBadge } from './CategoryBadge';
import { CategoryIcon } from './CategoryIcon';

type HabitCardProps = {
  habit: HabitWithCategory | TodayHabit;
  onAddProgress?: (id: string, amount: number) => void;
  onComplete?: (id: string) => void;
  onPress?: (id: string) => void;
  onUndo?: (id: string) => void;
};

function isTodayHabit(habit: HabitWithCategory | TodayHabit): habit is TodayHabit {
  return 'is_completed' in habit;
}

function getHabitStreakLabel(habit: HabitWithCategory | TodayHabit) {
  if (habit.current_streak <= 0) {
    return null;
  }

  if (habit.frequency === 'daily') {
    return habit.current_streak === 1
      ? '1 dia seguido'
      : `${habit.current_streak} dias seguidos`;
  }

  return habit.current_streak === 1
    ? '1 vez seguida'
    : `${habit.current_streak} vezes seguidas`;
}

function getBestStreakLabel(habit: HabitWithCategory | TodayHabit) {
  if (habit.best_streak <= 0) {
    return null;
  }

  const unit = habit.frequency === 'daily' ? 'dias' : 'vezes';

  return `Melhor: ${habit.best_streak} ${unit}`;
}

function getQuickValues(habit: HabitWithCategory | TodayHabit) {
  if (!habit.quick_values) {
    return [];
  }

  try {
    const parsed = JSON.parse(habit.quick_values);

    return Array.isArray(parsed)
      ? parsed.map(Number).filter((value) => Number.isFinite(value) && value > 0)
      : [];
  } catch {
    return [];
  }
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function parseAmount(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function HabitCard({ habit, onAddProgress, onComplete, onPress, onUndo }: HabitCardProps) {
  const colors = useThemeColors();
  const [manualValue, setManualValue] = useState('');
  const checkScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const completed = isTodayHabit(habit) && habit.is_completed;
  const streakLabel = getHabitStreakLabel(habit);
  const bestStreakLabel = getBestStreakLabel(habit);
  const isQuantitative = habit.tracking_type === 'quantitative' && habit.target_value;
  const progressValue = isTodayHabit(habit) ? habit.progress_value : 0;
  const progressPercent = isQuantitative
    ? Math.min(progressValue / (habit.target_value ?? 1), 1)
    : 0;
  const quickValues = getQuickValues(habit);

  function handleManualProgressPress() {
    const parsedValue = parseAmount(manualValue);

    if (!parsedValue) {
      return;
    }

    onAddProgress?.(habit.id, parsedValue);
    setManualValue('');
  }

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
      onPress={onPress ? () => onPress(habit.id) : undefined}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card
        style={[
          styles.card,
          { borderColor: `${habit.category_color}26` },
          completed && {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.successSoft,
            opacity: 0.9,
          },
        ]}>
        <View style={styles.row}>
          <View
            style={[
              styles.accent,
              { backgroundColor: completed ? colors.success : habit.category_color },
            ]}
          />
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
              {streakLabel ? (
                <View style={[styles.streakChip, { backgroundColor: colors.warningSoft }]}>
                  <Flame color={colors.warning} size={13} strokeWidth={2.4} />
                  <AppText color={colors.warning} variant="caption">
                    {streakLabel}
                  </AppText>
                </View>
              ) : null}
              {bestStreakLabel ? (
                <View style={[styles.bestChip, { backgroundColor: colors.primarySoft }]}>
                  <Trophy color={colors.primary} size={13} strokeWidth={2.4} />
                  <AppText color={colors.primary} variant="caption">
                    {bestStreakLabel}
                  </AppText>
                </View>
              ) : null}
              {habit.consistency_label ? (
                <View style={[styles.consistencyChip, { backgroundColor: colors.surfaceMuted }]}>
                  <Gauge color={colors.textMuted} size={13} strokeWidth={2.4} />
                  <AppText color={colors.textMuted} variant="caption">
                    {habit.consistency_label}
                  </AppText>
                </View>
              ) : null}
            </View>
            {isQuantitative ? (
              <View style={styles.progressArea}>
                <View style={styles.progressHeader}>
                  <AppText color={colors.textMuted} variant="caption">
                    {formatAmount(progressValue)} / {formatAmount(habit.target_value ?? 0)}{' '}
                    {habit.target_unit}
                  </AppText>
                  <AppText color={completed ? colors.success : colors.textMuted} variant="caption">
                    {Math.round(progressPercent * 100)}%
                  </AppText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: completed ? colors.success : habit.category_color,
                        width: `${progressPercent * 100}%`,
                      },
                    ]}
                  />
                </View>

                {onAddProgress && !completed ? (
                  <View style={styles.progressControls}>
                    {quickValues.map((value) => (
                      <Pressable
                        accessibilityRole="button"
                        key={value}
                        onPress={() => onAddProgress(habit.id, value)}
                        style={({ pressed }) => [
                          styles.quickValueButton,
                          { backgroundColor: `${habit.category_color}16` },
                          pressed && styles.pressed,
                        ]}>
                        <AppText color={habit.category_color} variant="caption">
                          +{formatAmount(value)}
                          {habit.target_unit}
                        </AppText>
                      </Pressable>
                    ))}
                    <View style={styles.manualProgress}>
                      <TextInput
                        keyboardType="decimal-pad"
                        onChangeText={setManualValue}
                        placeholder="Valor"
                        placeholderTextColor={colors.textSoft}
                        style={[
                          styles.manualInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        value={manualValue}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={handleManualProgressPress}
                        style={({ pressed }) => [
                          styles.addButton,
                          { backgroundColor: colors.habitSoft },
                          pressed && styles.pressed,
                        ]}>
                        <AppText color={colors.habit} variant="caption">
                          Adicionar
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
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
  scheduleChip: {
    borderRadius: radius.md,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  streakChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  bestChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  consistencyChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  progressArea: {
    gap: spacing.sm,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressTrack: {
    borderRadius: radius.sm,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.sm,
    height: '100%',
  },
  progressControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickValueButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  manualProgress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: '100%',
  },
  manualInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
