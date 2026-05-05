import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, Repeat2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen, AppText, EmptyState, HabitCard, PrimaryButton, SectionHeader } from '@/components';
import { getHabits, initDatabase, type HabitWithCategory } from '@/database';
import { colors, spacing } from '@/theme';

export default function HabitsScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<HabitWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    setIsLoading(true);
    await initDatabase();
    setHabits(await getHabits());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits().catch(console.error);
    }, [loadHabits])
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="heading">Hábitos</AppText>
          <AppText color={colors.textMuted}>
            Rotinas recorrentes para repetir no ciclo certo.
          </AppText>
        </View>
        <PrimaryButton icon={Plus} label="Novo" onPress={() => router.push('/habit/new')} />
      </View>

      {!isLoading && habits.length === 0 ? (
        <EmptyState
          description="Crie um hábito diário, semanal ou mensal para ele aparecer aqui e na tela Hoje."
          icon={Repeat2}
          title="Nenhum hábito cadastrado"
        />
      ) : null}

      {habits.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader count={habits.length} subtitle="Todos os hábitos cadastrados" title="Seus hábitos" />
          <View style={styles.list}>
            {habits.map((habit) => (
              <HabitCard
                habit={habit}
                key={habit.id}
                onPress={(id) => router.push({ pathname: '/habit/[id]', params: { id } })}
              />
            ))}
          </View>
        </View>
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
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
