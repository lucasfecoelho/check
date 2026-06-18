import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, ListTodo, NotebookPen, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppScreen,
  AppText,
  BackButton,
  Card,
  EmptyState,
  NotebookForm,
  type NotebookFormValues,
} from '@/components';
import {
  archiveNotebookEntry,
  deleteNotebookEntry,
  getNotebookEntryById,
  getNotebookItems,
  initDatabase,
  syncNotebookItems,
  updateNotebookEntry,
  type NotebookEntry,
  type NotebookItem,
} from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

export default function NotebookEntryDetailsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<NotebookEntry | null>(null);
  const [items, setItems] = useState<NotebookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEntry() {
      if (!id) {
        return;
      }

      await initDatabase();
      const [loadedEntry, loadedItems] = await Promise.all([
        getNotebookEntryById(id),
        getNotebookItems(id),
      ]);

      setEntry(loadedEntry);
      setItems(loadedItems);
      setIsLoading(false);
    }

    loadEntry().catch((loadError) => {
      setError(
        loadError instanceof Error ? loadError.message : 'Não foi possível abrir a anotação.'
      );
      setIsLoading(false);
    });
  }, [id]);

  async function handleUpdateEntry(values: NotebookFormValues) {
    if (!id) {
      return;
    }

    await updateNotebookEntry(id, values);
    await syncNotebookItems(id, values.items);

    router.replace('/notebook');
  }

  function handleArchiveEntry() {
    if (!id) {
      return;
    }

    Alert.alert('Arquivar anotação?', 'Ela sairá da lista principal do Caderno.', [
      {
        style: 'cancel',
        text: 'Cancelar',
      },
      {
        onPress: () => {
          archiveNotebookEntry(id)
            .then(() => router.replace('/notebook'))
            .catch(console.error);
        },
        text: 'Arquivar',
      },
    ]);
  }

  function handleDeleteEntry() {
    if (!id) {
      return;
    }

    Alert.alert('Excluir anotação?', 'Deseja excluir esta anotação?', [
      {
        style: 'cancel',
        text: 'Cancelar',
      },
      {
        onPress: () => {
          deleteNotebookEntry(id)
            .then(() => router.replace('/notebook'))
            .catch(console.error);
        },
        style: 'destructive',
        text: 'Excluir',
      },
    ]);
  }

  function handleCreateTaskFromEntry() {
    if (!entry) {
      return;
    }

    router.push({
      pathname: '/task/new',
      params: {
        notebookEntryId: entry.id,
        title: entry.title,
      },
    });
  }

  if (!isLoading && (!entry || error)) {
    return (
      <AppScreen>
        <EmptyState
          description={error ?? 'Ela pode ter sido excluída.'}
          icon={NotebookPen}
          title="Anotação não encontrada"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BackButton />

      <View style={styles.header}>
        <AppText variant="heading">Editar anotação</AppText>
        <AppText color={colors.textMuted}>Atualize título, tipo, conteúdo ou itens.</AppText>
      </View>

      {entry ? (
        <NotebookForm
          initialItems={items}
          initialValues={entry}
          onSubmit={handleUpdateEntry}
          submitLabel="Salvar alterações"
        />
      ) : null}

      {entry ? (
        <Card style={styles.transformCard}>
          <View style={styles.actionsCopy}>
            <AppText variant="bodyStrong">Levar para Tarefas</AppText>
            <AppText color={colors.textMuted}>
              Crie uma tarefa do Check usando o título desta anotação. Nada será convertido sem você salvar.
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleCreateTaskFromEntry}
            style={({ pressed }) => [
              styles.transformButton,
              { backgroundColor: colors.taskSoft },
              pressed && styles.pressed,
            ]}>
            <ListTodo color={colors.task} size={18} strokeWidth={2.2} />
            <AppText color={colors.task} variant="bodyStrong">
              Transformar em tarefa
            </AppText>
          </Pressable>
        </Card>
      ) : null}

      {entry ? (
        <Card style={styles.actionsCard}>
          <View style={styles.actionsCopy}>
            <AppText variant="bodyStrong">Organização</AppText>
            <AppText color={colors.textMuted}>
              Arquive para tirar da lista principal ou exclua de vez.
            </AppText>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={handleArchiveEntry}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.primarySoft },
                pressed && styles.pressed,
              ]}>
              <Archive color={colors.primary} size={18} strokeWidth={2.2} />
              <AppText color={colors.primary} variant="bodyStrong">
                Arquivar
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleDeleteEntry}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.dangerSoft },
                pressed && styles.pressed,
              ]}>
              <Trash2 color={colors.danger} size={18} strokeWidth={2.2} />
              <AppText color={colors.danger} variant="bodyStrong">
                Excluir
              </AppText>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  actionsCard: {
    gap: spacing.lg,
  },
  transformCard: {
    gap: spacing.lg,
  },
  actionsCopy: {
    gap: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  transformButton: {
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
