import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
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
import { colors, radius, spacing } from '@/theme';

export default function HabitDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [habit, setHabit] = useState<HabitWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
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
  dangerCard: {
    gap: spacing.lg,
  },
  deleteCopy: {
    gap: spacing.xs,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.dangerSoft,
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
