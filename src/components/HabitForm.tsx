import { Repeat2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import type {
  Category,
  CreateHabitInput,
  HabitFrequency,
  HabitTrackingType,
  UpdateHabitInput,
} from '@/database';
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
    quick_values: string | null;
    target_unit: string | null;
    target_value: number | null;
    time: string;
    title: string;
    tracking_type: HabitTrackingType;
    water_reminder_enabled: 0 | 1;
    water_reminder_end_time: string | null;
    water_reminder_interval_minutes: number;
    water_reminder_start_time: string | null;
  }>;
  onSubmit: (values: HabitFormValues) => Promise<void>;
  submitLabel: string;
};

const frequencies: HabitFrequency[] = ['daily', 'weekly', 'monthly'];
const lastDayValue = String(LAST_DAY_OF_MONTH);
const DEFAULT_WATER_REMINDER_START_TIME = '08:00';
const DEFAULT_WATER_REMINDER_END_TIME = '22:00';

function getInitialWeekdays(daysOfWeek?: string | number[] | null) {
  if (Array.isArray(daysOfWeek)) {
    return daysOfWeek;
  }

  return parseHabitWeekdays(daysOfWeek ?? null);
}

function parseNumberInput(value: string) {
  const match = value.trim().match(/-?\d+(?:[.,]\d+)?/);
  const normalized = match?.[0].replace(',', '.') ?? '';
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuickValues(value: string) {
  return value
    .split(/[,\s;]+/)
    .map(parseNumberInput)
    .filter((item): item is number => typeof item === 'number' && item > 0);
}

function formatQuickValues(value?: string | null) {
  if (!value) {
    return '';
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed.join(', ') : '';
  } catch {
    return '';
  }
}

export function HabitForm({ categories, initialValues, onSubmit, submitLabel }: HabitFormProps) {
  const colors = useThemeColors();
  const firstCategoryId = categories[0]?.id ?? '';
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? firstCategoryId);
  const [trackingType, setTrackingType] = useState<HabitTrackingType>(
    initialValues?.tracking_type ?? 'checkbox'
  );
  const [frequency, setFrequency] = useState<HabitFrequency>(initialValues?.frequency ?? 'daily');
  const [time, setTime] = useState(initialValues?.time ?? '');
  const [targetValue, setTargetValue] = useState(
    initialValues?.target_value ? String(initialValues.target_value) : ''
  );
  const [targetUnit, setTargetUnit] = useState(initialValues?.target_unit ?? '');
  const [quickValues, setQuickValues] = useState(formatQuickValues(initialValues?.quick_values));
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(
    initialValues?.water_reminder_enabled === 1
  );
  const [waterReminderStartTime, setWaterReminderStartTime] = useState(
    initialValues?.water_reminder_start_time ?? DEFAULT_WATER_REMINDER_START_TIME
  );
  const [waterReminderEndTime, setWaterReminderEndTime] = useState(
    initialValues?.water_reminder_end_time ?? DEFAULT_WATER_REMINDER_END_TIME
  );
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
      const parsedTargetValue = parseNumberInput(targetValue);
      const parsedQuickValues = parseQuickValues(quickValues);

      await onSubmit({
        category_id: categoryId,
        day_of_month: dayOfMonth ? Number(dayOfMonth) : null,
        days_of_week: weekdays,
        frequency,
        quick_values: trackingType === 'quantitative' ? parsedQuickValues : null,
        target_unit: trackingType === 'quantitative' ? targetUnit : null,
        target_value: trackingType === 'quantitative' ? parsedTargetValue : null,
        time,
        title,
        tracking_type: trackingType,
        water_reminder_enabled: trackingType === 'quantitative' ? waterReminderEnabled : false,
        water_reminder_end_time: waterReminderEndTime,
        water_reminder_interval_minutes: 60,
        water_reminder_start_time: waterReminderStartTime,
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
                backgroundColor: colors.surface,
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
          <AppText variant="bodyStrong">Tipo</AppText>
          <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
            {[
              { label: 'Checkbox', value: 'checkbox' as const },
              { label: 'Quantitativo', value: 'quantitative' as const },
            ].map((item) => {
              const isSelected = item.value === trackingType;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={item.value}
                  onPress={() => setTrackingType(item.value)}
                  style={[
                    styles.segment,
                    isSelected && { backgroundColor: colors.surface },
                  ]}>
                  <AppText color={isSelected ? colors.primary : colors.textMuted} variant="caption">
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {trackingType === 'quantitative' ? (
          <View style={styles.quantitativeBox}>
            <View style={styles.inlineFields}>
              <View style={[styles.field, styles.inlineField]}>
                <AppText variant="bodyStrong">Meta</AppText>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={setTargetValue}
                  placeholder="2.5"
                  placeholderTextColor={colors.textSoft}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={targetValue}
                />
              </View>
              <View style={[styles.field, styles.inlineField]}>
                <AppText variant="bodyStrong">Unidade</AppText>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setTargetUnit}
                  placeholder="L"
                  placeholderTextColor={colors.textSoft}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={targetUnit}
                />
              </View>
            </View>

            <View style={styles.field}>
              <AppText variant="bodyStrong">Botões rápidos</AppText>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={setQuickValues}
                placeholder="0.25, 0.5, 1"
                placeholderTextColor={colors.textSoft}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={quickValues}
              />
              <AppText color={colors.textMuted} variant="caption">
                Separe os valores com vírgula. Ex: 0.25, 0.5, 1
              </AppText>
            </View>

            <View
              style={[
                styles.waterReminderBox,
                { backgroundColor: colors.habitSoft, borderColor: colors.border },
              ]}>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <AppText variant="bodyStrong">Lembrete de agua</AppText>
                  <AppText color={colors.textMuted} variant="caption">
                    A cada 1 hora, dentro do horario definido.
                  </AppText>
                </View>
                <Switch
                  onValueChange={setWaterReminderEnabled}
                  thumbColor={waterReminderEnabled ? colors.primary : colors.surface}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  value={waterReminderEnabled}
                />
              </View>

              {waterReminderEnabled ? (
                <View style={styles.reminderFields}>
                  <View style={[styles.field, styles.inlineField]}>
                    <AppText color={colors.textMuted} variant="caption">
                      Inicio
                    </AppText>
                    <TimePickerField
                      defaultTime={DEFAULT_WATER_REMINDER_START_TIME}
                      onChange={setWaterReminderStartTime}
                      value={waterReminderStartTime}
                    />
                  </View>
                  <View style={[styles.field, styles.inlineField]}>
                    <AppText color={colors.textMuted} variant="caption">
                      Fim
                    </AppText>
                    <TimePickerField
                      defaultTime={DEFAULT_WATER_REMINDER_END_TIME}
                      onChange={setWaterReminderEndTime}
                      value={waterReminderEndTime}
                    />
                  </View>
                  <View style={[styles.frequencyPill, { backgroundColor: colors.surface }]}>
                    <AppText color={colors.habit} variant="caption">
                      Frequencia: a cada 1 hora
                    </AppText>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

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
                    backgroundColor: colors.surface,
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
  quantitativeBox: {
    gap: spacing.md,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  waterReminderBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  reminderFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  frequencyPill: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  monthlyOptions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  monthDayInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 50,
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
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '48%',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  chipSelected: {
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
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: spacing.sm,
  },
  lastDayChip: {
    alignItems: 'center',
    borderRadius: radius.lg,
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
