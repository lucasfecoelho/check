import { Repeat2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { Category, CreateHabitInput, HabitFrequency, UpdateHabitInput } from '@/database';
import { DEFAULT_HABIT_TIME } from '@/database/date';
import {
  frequencyLabels,
  LAST_DAY_OF_MONTH,
  parseHabitWeekdays,
  weekdayOptions,
} from '@/database/habitRules';
import { radius, spacing, typography, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';
import { CategoryIcon } from './CategoryIcon';
import { PrimaryButton } from './PrimaryButton';
import { TimePickerField } from './TimePickerField';

type HabitFormValues = CreateHabitInput | UpdateHabitInput;

type HabitFormProps = {
  categories: Category[];
  initialValues?: Partial<{
    category_id: string;
    day_of_month: number | null;
    days_of_week: string | number[] | null;
    frequency: HabitFrequency;
    time: string;
    title: string;
  }>;
  onSubmit: (values: HabitFormValues) => Promise<void>;
  submitLabel: string;
};

const frequencies: HabitFrequency[] = ['daily', 'weekly', 'monthly'];
const lastDayValue = String(LAST_DAY_OF_MONTH);

function getInitialWeekdays(daysOfWeek?: string | number[] | null) {
  if (Array.isArray(daysOfWeek)) {
    return daysOfWeek;
  }

  return parseHabitWeekdays(daysOfWeek ?? null);
}

export function HabitForm({ categories, initialValues, onSubmit, submitLabel }: HabitFormProps) {
  const colors = useThemeColors();
  const firstCategoryId = categories[0]?.id ?? '';
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? firstCategoryId);
  const [frequency, setFrequency] = useState<HabitFrequency>(initialValues?.frequency ?? 'daily');
  const [time, setTime] = useState(initialValues?.time ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(getInitialWeekdays(initialValues?.days_of_week));
  const [dayOfMonth, setDayOfMonth] = useState(
    initialValues?.day_of_month ? String(initialValues.day_of_month) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!categoryId && firstCategoryId) {
      setCategoryId(firstCategoryId);
    }
  }, [categoryId, firstCategoryId]);

  function toggleWeekday(day: number) {
    setWeekdays((currentDays) =>
      currentDays.includes(day)
        ? currentDays.filter((currentDay) => currentDay !== day)
        : [...currentDays, day].sort((left, right) => left - right)
    );
  }

  async function handleSubmit() {
    setError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        category_id: categoryId,
        day_of_month: dayOfMonth ? Number(dayOfMonth) : null,
        days_of_week: weekdays,
        frequency,
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
            placeholder="Ex: Ler por 10 minutos"
            placeholderTextColor={colors.textSoft}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
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
                  style={[
                    styles.categoryChip,
                    { borderColor: colors.border },
                    isSelected && {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}>
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

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Repeat2 color={colors.textMuted} size={16} strokeWidth={2.2} />
            <AppText variant="bodyStrong">Frequência</AppText>
          </View>
          <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
            {frequencies.map((item) => {
              const isSelected = item === frequency;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={item}
                  onPress={() => setFrequency(item)}
                  style={[
                    styles.segment,
                    isSelected && { backgroundColor: colors.surface },
                  ]}>
                  <AppText color={isSelected ? colors.primary : colors.textMuted} variant="caption">
                    {frequencyLabels[item]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {frequency === 'weekly' ? (
          <View style={styles.field}>
            <AppText variant="bodyStrong">Dias da semana</AppText>
            <View style={styles.weekdays}>
              {weekdayOptions.map((day) => {
                const isSelected = weekdays.includes(day.value);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={day.value}
                    onPress={() => toggleWeekday(day.value)}
                    style={[
                      styles.weekdayChip,
                      { borderColor: colors.border },
                      isSelected && {
                        backgroundColor: colors.primarySoft,
                        borderColor: colors.primary,
                      },
                    ]}>
                    <AppText
                      color={isSelected ? colors.primary : colors.textMuted}
                      variant="caption">
                      {day.shortLabel}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {frequency === 'monthly' ? (
          <View style={styles.field}>
            <AppText variant="bodyStrong">Dia do mês</AppText>
            <View style={styles.monthlyOptions}>
              <TextInput
                keyboardType="number-pad"
                maxLength={2}
                onChangeText={setDayOfMonth}
                placeholder="25"
                placeholderTextColor={colors.textSoft}
                style={[
                  styles.monthDayInput,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={dayOfMonth === lastDayValue ? '' : dayOfMonth}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setDayOfMonth(lastDayValue)}
                style={[
                  styles.lastDayChip,
                  { borderColor: colors.border },
                  dayOfMonth === lastDayValue && {
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primary,
                  },
                ]}>
                <AppText
                  color={dayOfMonth === lastDayValue ? colors.primary : colors.textMuted}
                  variant="caption">
                  Último dia do mês
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.field}>
          <AppText variant="bodyStrong">Horário</AppText>
          <TimePickerField defaultTime={DEFAULT_HABIT_TIME} onChange={setTime} value={time} />
        </View>

        <View style={[styles.preview, { backgroundColor: colors.primarySoft }]}>
          <AppText color={colors.textMuted} variant="caption">
            Horário vazio salva {DEFAULT_HABIT_TIME}
          </AppText>
        </View>
      </Card>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
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
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  monthlyOptions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthDayInput: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    minWidth: 88,
    paddingHorizontal: spacing.md,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '48%',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
  },
  segmented: {
    borderRadius: radius.md,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  segmentSelected: {
  },
  weekdays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekdayChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: spacing.sm,
  },
  lastDayChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  preview: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBox: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
