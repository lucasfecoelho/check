import { Check, Dumbbell, HeartPulse, Timer, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import type { SaveWorkoutCheckInInput, WorkoutCheckIn, WorkoutType } from '@/database';
import { workoutTypeLabels } from '@/database';
import { radius, spacing, typography, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

type WorkoutCheckInModalProps = {
  checkIn?: WorkoutCheckIn | null;
  habitId: string | null;
  onClose: () => void;
  onSave: (input: SaveWorkoutCheckInInput) => Promise<void>;
  visible: boolean;
};

const workoutTypeOptions: WorkoutType[] = [
  'chest_triceps',
  'back_biceps',
  'legs',
  'shoulders',
  'full_body',
  'cardio',
  'other',
];

const workoutMinuteOptions = [30, 45, 60, 75];
const cardioMinuteOptions = [10, 20, 30];

function parseMinuteInput(value: string) {
  const parsed = Number(value.replace(/\D/g, ''));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function WorkoutCheckInModal({
  checkIn,
  habitId,
  onClose,
  onSave,
  visible,
}: WorkoutCheckInModalProps) {
  const colors = useThemeColors();
  const [workoutType, setWorkoutType] = useState<WorkoutType>('chest_triceps');
  const [workoutMinutes, setWorkoutMinutes] = useState('');
  const [didCardio, setDidCardio] = useState(false);
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(checkIn);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setWorkoutType(checkIn?.workout_type ?? 'chest_triceps');
    setWorkoutMinutes(checkIn ? String(checkIn.workout_minutes) : '');
    setDidCardio(Boolean(checkIn?.did_cardio));
    setCardioMinutes(checkIn?.cardio_minutes ? String(checkIn.cardio_minutes) : '');
    setNote(checkIn?.note ?? '');
    setError(null);
  }, [checkIn, visible]);

  const canSave = useMemo(() => {
    const totalMinutes = parseMinuteInput(workoutMinutes);
    const cardioTotal = parseMinuteInput(cardioMinutes);

    return Boolean(habitId && totalMinutes && (!didCardio || cardioTotal));
  }, [cardioMinutes, didCardio, habitId, workoutMinutes]);

  async function handleSave() {
    const totalMinutes = parseMinuteInput(workoutMinutes);
    const cardioTotal = didCardio ? parseMinuteInput(cardioMinutes) : null;

    if (!habitId || !totalMinutes || (didCardio && !cardioTotal)) {
      setError('Preencha os tempos em minutos.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        cardio_minutes: cardioTotal,
        did_cardio: didCardio,
        habit_id: habitId,
        note,
        workout_minutes: totalMinutes,
        workout_type: workoutType,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.primaryDark,
            },
          ]}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.habitSoft }]}>
              <Dumbbell color={colors.habit} size={21} strokeWidth={2.4} />
            </View>
            <View style={styles.headerCopy}>
              <AppText variant="bodyStrong">
                {isEditing ? 'Editar treino' : 'Check-in de treino'}
              </AppText>
              <AppText color={colors.textMuted} variant="caption">
                Registre o essencial sem perder o ritmo.
              </AppText>
            </View>
            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
              ]}>
              <X color={colors.textMuted} size={18} strokeWidth={2.3} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <AppText variant="bodyStrong">Tipo de treino</AppText>
              <View style={styles.optionsGrid}>
                {workoutTypeOptions.map((option) => {
                  const selected = option === workoutType;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option}
                      onPress={() => setWorkoutType(option)}
                      style={({ pressed }) => [
                        styles.optionChip,
                        { borderColor: colors.border },
                        selected && {
                          backgroundColor: colors.habitSoft,
                          borderColor: colors.habit,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <AppText
                        color={selected ? colors.habit : colors.textMuted}
                        numberOfLines={1}
                        variant="caption">
                        {workoutTypeLabels[option]}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Timer color={colors.textMuted} size={16} strokeWidth={2.3} />
                <AppText variant="bodyStrong">Tempo total</AppText>
              </View>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setWorkoutMinutes}
                placeholder="60"
                placeholderTextColor={colors.textSoft}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={workoutMinutes}
              />
              <View style={styles.quickRow}>
                {workoutMinuteOptions.map((minutes) => (
                  <Pressable
                    accessibilityRole="button"
                    key={minutes}
                    onPress={() => setWorkoutMinutes(String(minutes))}
                    style={({ pressed }) => [
                      styles.quickButton,
                      { backgroundColor: colors.surfaceMuted },
                      workoutMinutes === String(minutes) && { backgroundColor: colors.primarySoft },
                      pressed && styles.pressed,
                    ]}>
                    <AppText
                      color={workoutMinutes === String(minutes) ? colors.primary : colors.textMuted}
                      variant="caption">
                      {minutes} min
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.cardioBox,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}>
              <View style={styles.switchRow}>
                <View style={styles.labelRow}>
                  <HeartPulse color={colors.success} size={17} strokeWidth={2.4} />
                  <AppText variant="bodyStrong">Fiz cardio</AppText>
                </View>
                <Switch
                  onValueChange={setDidCardio}
                  thumbColor={didCardio ? colors.success : colors.surface}
                  trackColor={{ false: colors.border, true: colors.successSoft }}
                  value={didCardio}
                />
              </View>

              {didCardio ? (
                <View style={styles.cardioFields}>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={setCardioMinutes}
                    placeholder="20"
                    placeholderTextColor={colors.textSoft}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={cardioMinutes}
                  />
                  <View style={styles.quickRow}>
                    {cardioMinuteOptions.map((minutes) => (
                      <Pressable
                        accessibilityRole="button"
                        key={minutes}
                        onPress={() => setCardioMinutes(String(minutes))}
                        style={({ pressed }) => [
                          styles.quickButton,
                          { backgroundColor: colors.surface },
                          cardioMinutes === String(minutes) && {
                            backgroundColor: colors.successSoft,
                          },
                          pressed && styles.pressed,
                        ]}>
                        <AppText
                          color={
                            cardioMinutes === String(minutes)
                              ? colors.success
                              : colors.textMuted
                          }
                          variant="caption">
                          {minutes} min
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <AppText variant="bodyStrong">Observação</AppText>
              <TextInput
                multiline
                onChangeText={setNote}
                placeholder="Treino bom, aumentei carga no supino"
                placeholderTextColor={colors.textSoft}
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                textAlignVertical="top"
                value={note}
              />
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                <AppText color={colors.danger} variant="caption">
                  {error}
                </AppText>
              </View>
            ) : null}
          </ScrollView>

          <PrimaryButton
            disabled={!canSave || isSaving}
            icon={Check}
            label={isSaving ? 'Salvando...' : 'Salvar treino'}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 16, 26, 0.44)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    maxHeight: '90%',
    padding: spacing.lg,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xs,
  },
  field: {
    gap: spacing.sm,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 38,
    minWidth: '30%',
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cardioBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardioFields: {
    gap: spacing.sm,
  },
  noteInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 92,
    padding: spacing.lg,
  },
  errorBox: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
