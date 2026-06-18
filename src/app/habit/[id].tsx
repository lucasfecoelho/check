import { useLocalSearchParams, useRouter } from 'expo-router';
import { Flame, Gauge, Trash2, Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppScreen, AppText, BackButton, Card, EmptyState, HabitForm } from '@/components';
import {
  deleteHabit,
  getCategories,
  getHabitById,
  initDatabase,
  updateHabit,
  type Category,
  type HabitWithCategory,
  type UpdateHabitInput,
} from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

export default function HabitDetailsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [habit, setHabit] = useState<HabitWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streakUnit = habit?.frequency === 'daily' ? 'dias' : 'vezes';

  useEffect(() => {
    async function loadHabit() {
      if (!id) {
        return;
      }

      await initDatabase();
      const [loadedCategories, loadedHabit] = await Promise.all([getCategories(), getHabitById(id)]);
      setCategories(loadedCategories);
      setHabit(loadedHabit);
      setIsLoading(false);
    }

    loadHabit().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir o hábito.');
      setIsLoading(false);
    });
  }, [id]);

  async function handleUpdateHabit(values: UpdateHabitInput) {
    if (!id) {
      return;
    }

    await updateHabit(id, values);
    router.replace('/habits');
  }

  function handleDeleteHabit() {
    if (!id) {
      return;
    }

    Alert.alert('Excluir hábito?', 'Deseja excluir este hábito?', [
      {
        style: 'cancel',
        text: 'Cancelar',
      },
      {
        onPress: () => {
          deleteHabit(id)
            .then(() => router.replace('/habits'))
            .catch(console.error);
        },
        style: 'destructive',
        text: 'Excluir',
      },
    ]);
  }

  if (!isLoading && (!habit || error)) {
    return (
      <AppScreen>
        <EmptyState
          description={error ?? 'Ele pode ter sido excluído.'}
          icon={Trash2}
          title="Hábito não encontrado"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Editar hábito</AppText>
        <AppText color={colors.textMuted}>Atualize frequência, categoria e horário.</AppText>
      </View>

      {habit ? (
        <Card style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View style={[styles.streakIcon, { backgroundColor: colors.warningSoft }]}>
              <Flame color={colors.warning} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.streakCopy}>
              <AppText variant="bodyStrong">Sequência do hábito</AppText>
              <AppText color={colors.textMuted} variant="caption">
                Fins de semana não quebram hábitos diários.
              </AppText>
            </View>
          </View>

          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <AppText variant="title">{habit.current_streak}</AppText>
              <AppText color={colors.textMuted} variant="caption">
                {streakUnit} seguidos
              </AppText>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakStat}>
              <Trophy color={colors.primary} size={18} strokeWidth={2.4} />
              <AppText color={colors.primary} variant="caption">
                Melhor: {habit.best_streak} {streakUnit}
              </AppText>
            </View>
          </View>

          {habit.consistency_label ? (
            <View style={[styles.consistencyRow, { backgroundColor: colors.surfaceMuted }]}>
              <Gauge color={colors.textMuted} size={15} strokeWidth={2.4} />
              <AppText color={colors.textMuted} variant="caption">
                {habit.consistency_label}
              </AppText>
            </View>
          ) : null}
        </Card>
      ) : null}

      {habit ? (
        <HabitForm
          categories={categories}
          initialValues={habit}
          onSubmit={handleUpdateHabit}
          submitLabel="Salvar alterações"
        />
      ) : null}

      {habit ? (
        <Card style={styles.dangerCard}>
          <View style={styles.deleteCopy}>
            <AppText variant="bodyStrong">Excluir hábito?</AppText>
            <AppText color={colors.textMuted}>Deseja excluir este hábito?</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleDeleteHabit}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: colors.dangerSoft },
              pressed && styles.pressed,
            ]}>
            <Trash2 color={colors.danger} size={18} strokeWidth={2.2} />
            <AppText color={colors.danger} variant="bodyStrong">
              Excluir
            </AppText>
          </Pressable>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  streakCard: {
    gap: spacing.lg,
  },
  streakHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  streakIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  streakCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  streakStats: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.md,
  },
  streakStat: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  streakDivider: {
    width: 1,
  },
  consistencyRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
  },
  dangerCard: {
    gap: spacing.lg,
  },
  deleteCopy: {
    gap: spacing.xs,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
