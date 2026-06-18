import { useFocusEffect, useRouter } from 'expo-router';
import {
  CheckCircle2,
  NotebookPen,
  Plus,
  Search,
  SendHorizontal,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  AppScreen,
  AppText,
  Card,
  EmptyState,
  NotebookCard,
  PrimaryButton,
  SectionHeader,
} from '@/components';
import {
  createNotebookEntry,
  initDatabase,
  searchNotebookEntries,
  type NotebookEntry,
  type NotebookEntryFilter,
} from '@/database';
import { radius, spacing, typography, useThemeColors } from '@/theme';

const QUICK_NOTE_TITLE_LIMIT = 52;

const notebookFilters: { label: string; value: NotebookEntryFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Notas', value: 'note' },
  { label: 'Listas', value: 'list' },
  { label: 'Tarefas', value: 'task' },
  { label: 'Arquivados', value: 'archived' },
];

function buildQuickNote(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ');

  if (normalized.length <= QUICK_NOTE_TITLE_LIMIT) {
    return {
      content: null,
      title: normalized,
    };
  }

  return {
    content: text.trim(),
    title: `${normalized.slice(0, QUICK_NOTE_TITLE_LIMIT).trimEnd()}…`,
  };
}

export default function NotebookScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const loadRequestIdRef = useRef(0);
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickNoteFeedback, setQuickNoteFeedback] = useState<string | null>(null);
  const [isSavingQuickNote, setIsSavingQuickNote] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<NotebookEntryFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasSearch = debouncedSearchText.trim().length > 0;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const loadEntries = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;

    setIsLoading(true);
    await initDatabase();
    const nextEntries = await searchNotebookEntries(selectedFilter, debouncedSearchText);

    if (requestId === loadRequestIdRef.current) {
      setEntries(nextEntries);
      setIsLoading(false);
    }
  }, [debouncedSearchText, selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      loadEntries().catch(console.error);
    }, [loadEntries])
  );

  async function handleSaveQuickNote() {
    const normalizedText = quickNoteText.trim();

    if (!normalizedText || isSavingQuickNote) {
      return;
    }

    setIsSavingQuickNote(true);
    setQuickNoteFeedback(null);

    try {
      const note = buildQuickNote(normalizedText);
      await initDatabase();
      await createNotebookEntry({
        content: note.content,
        title: note.title,
        type: 'note',
      });
      setQuickNoteText('');
      setQuickNoteFeedback('Anotação salva');
      await loadEntries();
    } finally {
      setIsSavingQuickNote(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="heading">Caderno</AppText>
          <AppText color={colors.textMuted}>Notas rápidas, listas e lembretes soltos.</AppText>
        </View>
        <PrimaryButton icon={Plus} label="Nova" onPress={() => router.push('/notebook/new')} />
      </View>

      <Card style={styles.quickCaptureCard}>
        <View style={styles.quickCaptureHeader}>
          <View style={[styles.quickCaptureIcon, { backgroundColor: colors.primarySoft }]}>
            <NotebookPen color={colors.primary} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.quickCaptureCopy}>
            <AppText variant="bodyStrong">Anotação rápida</AppText>
            <AppText color={colors.textMuted} variant="caption">
              Digite e salve sem abrir outra tela.
            </AppText>
          </View>
        </View>

        <View style={styles.quickCaptureComposer}>
          <TextInput
            multiline
            onChangeText={(value) => {
              setQuickNoteText(value);
              setQuickNoteFeedback(null);
            }}
            onSubmitEditing={() => handleSaveQuickNote().catch(console.error)}
            placeholder="Escreva um pensamento, ideia ou lembrete..."
            placeholderTextColor={colors.textSoft}
            returnKeyType="done"
            style={[
              styles.quickCaptureInput,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            textAlignVertical="top"
            value={quickNoteText}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!quickNoteText.trim() || isSavingQuickNote}
            onPress={() => handleSaveQuickNote().catch(console.error)}
            style={({ pressed }) => [
              styles.quickCaptureButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
              (!quickNoteText.trim() || isSavingQuickNote) && styles.disabled,
            ]}>
            <SendHorizontal color={colors.onPrimary} size={18} strokeWidth={2.4} />
          </Pressable>
        </View>

        {quickNoteFeedback ? (
          <View style={[styles.feedback, { backgroundColor: colors.successSoft }]}>
            <CheckCircle2 color={colors.success} size={16} strokeWidth={2.2} />
            <AppText color={colors.success} variant="caption">
              {quickNoteFeedback}
            </AppText>
          </View>
        ) : null}
      </Card>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        <Search color={colors.textMuted} size={18} strokeWidth={2.2} />
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearchText}
          placeholder="Buscar no Caderno"
          placeholderTextColor={colors.textSoft}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchText}
        />
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filtersContent}
        showsHorizontalScrollIndicator={false}>
        {notebookFilters.map((filter) => {
          const isSelected = filter.value === selectedFilter;

          return (
            <Pressable
              accessibilityRole="button"
              key={filter.value}
              onPress={() => setSelectedFilter(filter.value)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
                pressed && styles.pressed,
              ]}>
              <AppText
                color={isSelected ? colors.primary : colors.textMuted}
                variant="bodyStrong">
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {!isLoading && entries.length === 0 ? (
        <EmptyState
          description={
            hasSearch
              ? 'Tente outro termo ou ajuste os filtros.'
              : selectedFilter === 'archived'
                ? 'As anotações arquivadas aparecerão aqui.'
                : 'Use o Caderno para guardar ideias, listas e lembretes rápidos.'
          }
          icon={NotebookPen}
          iconBackgroundColor={colors.primarySoft}
          iconColor={colors.primary}
          title={
            hasSearch
              ? 'Nenhum resultado encontrado'
              : selectedFilter === 'archived'
                ? 'Nenhuma anotação arquivada'
                : 'Nenhuma anotação ainda'
          }
        />
      ) : null}

      {entries.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            count={entries.length}
            subtitle={hasSearch ? 'Resultados da busca' : 'Mais recentes primeiro'}
            title={selectedFilter === 'archived' ? 'Arquivadas' : 'Suas anotações'}
          />
          <View style={styles.list}>
            {entries.map((entry) => (
              <NotebookCard
                entry={entry}
                key={entry.id}
                onPress={(id) => router.push({ pathname: '/notebook/[id]', params: { id } })}
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
  quickCaptureCard: {
    gap: spacing.md,
  },
  quickCaptureHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickCaptureIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  quickCaptureCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  quickCaptureComposer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickCaptureInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  quickCaptureButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  feedback: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  searchBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
  },
  filtersContent: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.48,
  },
});
