import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen, AppText, BackButton, HabitForm } from '@/components';
import {
  createHabit,
  getCategories,
  initDatabase,
  type Category,
  type CreateHabitInput,
} from '@/database';
import { spacing, useThemeColors } from '@/theme';

export default function NewHabitScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadCategories() {
      await initDatabase();
      setCategories(await getCategories());
    }

    loadCategories().catch(console.error);
  }, []);

  async function handleCreateHabit(values: CreateHabitInput) {
    await createHabit(values);
    router.replace('/habits');
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Novo hábito</AppText>
        <AppText color={colors.textMuted}>Crie uma rotina recorrente para o Check.</AppText>
      </View>

      <HabitForm categories={categories} onSubmit={handleCreateHabit} submitLabel="Salvar hábito" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
});
