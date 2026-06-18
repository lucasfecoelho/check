import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  AppScreen,
  AppText,
  BackButton,
  NotebookForm,
  type NotebookFormValues,
} from '@/components';
import { createNotebookEntry, initDatabase, syncNotebookItems } from '@/database';
import { spacing, useThemeColors } from '@/theme';

export default function NewNotebookEntryScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  async function handleCreateEntry(values: NotebookFormValues) {
    await initDatabase();
    const entry = await createNotebookEntry(values);

    if (entry) {
      await syncNotebookItems(entry.id, values.items);
    }

    router.replace('/notebook');
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Nova anotação</AppText>
        <AppText color={colors.textMuted}>
          Guarde algo rápido sem transformar isso em tarefa do app.
        </AppText>
      </View>

      <NotebookForm onSubmit={handleCreateEntry} submitLabel="Salvar anotação" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
});
