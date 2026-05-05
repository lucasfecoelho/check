import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Category, CreateTaskInput, UpdateTaskInput } from '@/database';
import {
  DEFAULT_TASK_TIME,
  getTodayDateKey,
  isDateKeyValid,
} from '@/database/date';
import { colors, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryIcon } from './CategoryIcon';
import { DatePickerField } from './DatePickerField';
import { PrimaryButton } from './PrimaryButton';
import { TimePickerField } from './TimePickerField';

type TaskFormValues = CreateTaskInput | UpdateTaskInput;

type TaskFormProps = {
  categories: Category[];
  defaultTime?: string;
  initialValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  submitLabel: string;
};

export function TaskForm({
  categories,
  defaultTime = DEFAULT_TASK_TIME,
  initialValues,
  onSubmit,
  submitLabel,
}: TaskFormProps) {
  const firstCategoryId = categories[0]?.id ?? '';
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? firstCategoryId);
  const [date, setDate] = useState(initialValues?.date ?? getTodayDateKey());
  const [time, setTime] = useState(initialValues?.time ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!categoryId && firstCategoryId) {
      setCategoryId(firstCategoryId);
    }
  }, [categoryId, firstCategoryId]);

  async function handleSubmit() {
    setError(null);
    setIsSaving(true);

    try {
      if (!isDateKeyValid(date)) {
        throw new Error('Use uma data válida no formato DD/MM/AAAA.');
      }

      await onSubmit({
        category_id: categoryId,
        date,
        time,
        title,
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
            placeholder="Ex: Pagar boleto"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            value={title}
          />
        </View>

        <View style={styles.field}>
          <AppText variant="bodyStrong">Categoria</AppText>
          <View style={styles.categories}>
            {categories.map((category) => {
              const isSelected = category.id === categoryId;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}>
                  <CategoryIcon color={category.color} name={category.icon} size={16} />
                  <AppText
                    color={isSelected ? colors.primary : colors.text}
                    numberOfLines={1}
                    variant="caption">
                    {category.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <AppText variant="bodyStrong">Data</AppText>
            <DatePickerField dateKey={date} onChange={setDate} />
          </View>

          <View style={styles.fieldHalf}>
            <AppText variant="bodyStrong">Horário</AppText>
            <TimePickerField defaultTime={defaultTime} onChange={setTime} value={time} />
          </View>
        </View>

        <View style={styles.preview}>
          <AppText color={colors.textMuted} variant="caption">
            Horário vazio salva {defaultTime}
          </AppText>
        </View>
      </Card>

      {error ? (
        <View style={styles.errorBox}>
          <AppText color={colors.danger} variant="caption">
            {error}
          </AppText>
        </View>
      ) : null}

      <PrimaryButton disabled={isSaving} label={isSaving ? 'Salvando...' : submitLabel} onPress={handleSubmit} />
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
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fieldHalf: {
    flex: 1,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '48%',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  categoryChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  preview: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
