import {
  CheckCircle2,
  Circle,
  ClipboardList,
  NotebookPen,
  Plus,
  StickyNote,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { NotebookEntryType, NotebookItem } from '@/database';
import { radius, spacing, typography, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';

export type NotebookDraftItem = {
  completed: boolean;
  id?: string;
  key: string;
  title: string;
};

export type NotebookFormValues = {
  content: string;
  items: NotebookDraftItem[];
  title: string;
  type: NotebookEntryType;
};

type NotebookFormProps = {
  initialItems?: NotebookItem[];
  initialValues?: {
    content?: string | null;
    title?: string;
    type?: NotebookEntryType;
  };
  onSubmit: (values: NotebookFormValues) => Promise<void>;
  submitLabel: string;
};

const typeOptions = [
  {
    icon: StickyNote,
    label: 'Nota',
    value: 'note' as const,
  },
  {
    icon: ClipboardList,
    label: 'Lista',
    value: 'list' as const,
  },
  {
    icon: NotebookPen,
    label: 'Tarefa',
    value: 'task' as const,
  },
];

function createDraftItemKey() {
  const randomUUID = globalThis.crypto?.randomUUID?.();

  return randomUUID ? `draft-${randomUUID}` : `draft-${Date.now()}-${Math.random()}`;
}

function toDraftItems(items: NotebookItem[] = []): NotebookDraftItem[] {
  return items.map((item) => ({
    completed: item.completed === 1,
    id: item.id,
    key: item.id,
    title: item.title,
  }));
}

export function NotebookForm({
  initialItems,
  initialValues,
  onSubmit,
  submitLabel,
}: NotebookFormProps) {
  const colors = useThemeColors();
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [type, setType] = useState<NotebookEntryType>(initialValues?.type ?? 'note');
  const [items, setItems] = useState<NotebookDraftItem[]>(() => toDraftItems(initialItems));
  const [draftItemTitle, setDraftItemTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const supportsItems = type === 'list' || type === 'task';
  const itemsLabel = type === 'task' ? 'Subtarefas' : 'Itens da lista';
  const itemPlaceholder =
    type === 'task' ? 'Ex: Separar documentos' : 'Ex: Comprar café';

  function handleAddItem() {
    const normalizedTitle = draftItemTitle.trim();

    if (!normalizedTitle) {
      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        completed: false,
        key: createDraftItemKey(),
        title: normalizedTitle,
      },
    ]);
    setDraftItemTitle('');
  }

  function handleUpdateItemTitle(key: string, nextTitle: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.key === key
          ? {
              ...item,
              title: nextTitle,
            }
          : item
      )
    );
  }

  function handleToggleItemCompleted(key: string) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.key === key
          ? {
              ...item,
              completed: !item.completed,
            }
          : item
      )
    );
  }

  function handleRemoveItem(key: string) {
    setItems((currentItems) => currentItems.filter((item) => item.key !== key));
  }

  async function handleSubmit() {
    setError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        content,
        items: supportsItems
          ? items
              .map((item) => ({
                ...item,
                title: item.title.trim(),
              }))
              .filter((item) => item.title.length > 0)
          : [],
        title,
        type,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.formCard}>
        <View style={styles.field}>
          <AppText variant="bodyStrong">Título</AppText>
          <TextInput
            autoCapitalize="sentences"
            onChangeText={setTitle}
            placeholder="Ex: Ideias para o fim de semana"
            placeholderTextColor={colors.textSoft}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={title}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="bodyStrong">Tipo</AppText>
          <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
            {typeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === type;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[
                    styles.segment,
                    isSelected && { backgroundColor: colors.surface },
                  ]}>
                  <Icon
                    color={isSelected ? colors.primary : colors.textMuted}
                    size={16}
                    strokeWidth={2.2}
                  />
                  <AppText
                    color={isSelected ? colors.primary : colors.textMuted}
                    variant="caption">
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="bodyStrong">Conteúdo</AppText>
          <TextInput
            multiline
            onChangeText={setContent}
            placeholder={
              type === 'note'
                ? 'Escreva uma nota rápida...'
                : 'Detalhes opcionais para esta anotação...'
            }
            placeholderTextColor={colors.textSoft}
            style={[
              styles.textArea,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            textAlignVertical="top"
            value={content}
          />
        </View>

        {supportsItems ? (
          <View style={styles.field}>
            <AppText variant="bodyStrong">{itemsLabel}</AppText>

            <View style={styles.itemComposer}>
              <TextInput
                onChangeText={setDraftItemTitle}
                onSubmitEditing={handleAddItem}
                placeholder={itemPlaceholder}
                placeholderTextColor={colors.textSoft}
                returnKeyType="done"
                style={[
                  styles.itemInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={draftItemTitle}
              />
              <Pressable
                accessibilityRole="button"
                onPress={handleAddItem}
                style={({ pressed }) => [
                  styles.addItemButton,
                  { backgroundColor: colors.primarySoft },
                  pressed && styles.pressed,
                ]}>
                <Plus color={colors.primary} size={18} strokeWidth={2.4} />
              </Pressable>
            </View>

            {items.length > 0 ? (
              <View style={styles.itemsList}>
                {items.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleToggleItemCompleted(item.key)}
                      style={({ pressed }) => [styles.itemToggle, pressed && styles.pressed]}>
                      {item.completed ? (
                        <CheckCircle2 color={colors.success} size={22} strokeWidth={2.2} />
                      ) : (
                        <Circle color={colors.textMuted} size={22} strokeWidth={2.2} />
                      )}
                    </Pressable>

                    <TextInput
                      onChangeText={(value) => handleUpdateItemTitle(item.key, value)}
                      placeholder="Item"
                      placeholderTextColor={colors.textSoft}
                      style={[
                        styles.inlineItemInput,
                        {
                          color: item.completed ? colors.textMuted : colors.text,
                        },
                        item.completed && styles.completedText,
                      ]}
                      value={item.title}
                    />

                    <Pressable
                      accessibilityLabel="Remover item"
                      accessibilityRole="button"
                      onPress={() => handleRemoveItem(item.key)}
                      style={({ pressed }) => [styles.itemDelete, pressed && styles.pressed]}>
                      <Trash2 color={colors.danger} size={18} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.helperBox, { backgroundColor: colors.surfaceMuted }]}>
                <AppText color={colors.textMuted} variant="caption">
                  Adicione o primeiro item quando quiser.
                </AppText>
              </View>
            )}
          </View>
        ) : null}
      </Card>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
          <AppText color={colors.danger} variant="caption">
            {error}
          </AppText>
        </View>
      ) : null}

      <PrimaryButton
        disabled={isSaving}
        label={isSaving ? 'Salvando...' : submitLabel}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  formCard: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  segmented: {
    borderRadius: radius.lg,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 40,
  },
  textArea: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  itemComposer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  addItemButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemRow: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.sm,
  },
  itemToggle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineItemInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 44,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  itemDelete: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    width: 32,
  },
  helperBox: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  errorBox: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
