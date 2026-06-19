import { Moon, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { SleepEntry } from '@/database';
import { radius, spacing, typography, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';

type SleepCardProps = {
  entry: SleepEntry | null;
  onSave: (hours: number) => Promise<void>;
};

const quickValues = [6, 7, 8];

function formatHours(hours: number) {
  return Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(1)));
}

function parseHours(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 24 ? parsed : null;
}

export function SleepCard({ entry, onSave }: SleepCardProps) {
  const colors = useThemeColors();
  const [draftHours, setDraftHours] = useState(entry ? formatHours(entry.hours) : '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasEntry = Boolean(entry);

  useEffect(() => {
    setDraftHours(entry ? formatHours(entry.hours) : '');
  }, [entry]);

  async function handleSave(value = draftHours) {
    const parsedHours = parseHours(value);

    setError(null);

    if (parsedHours === null) {
      setError('Informe um valor entre 0 e 24 horas.');
      return;
    }

    setIsSaving(true);

    try {
      await onSave(parsedHours);
      setDraftHours(formatHours(parsedHours));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card style={[styles.card, { borderColor: colors.border }]}>
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <Moon color={colors.primary} size={21} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <AppText variant="bodyStrong">Sono de hoje</AppText>
          <AppText color={colors.textMuted} variant="caption">
            {hasEntry
              ? `Registrado: ${formatHours(entry?.hours ?? 0)}h`
              : 'Informe quantas horas você dormiu.'}
          </AppText>
        </View>
      </View>

      <View style={styles.controls}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setDraftHours}
          placeholder="7.5"
          placeholderTextColor={colors.textSoft}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={draftHours}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => handleSave()}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
            isSaving && styles.disabled,
          ]}>
          <Save color={colors.onPrimary} size={16} strokeWidth={2.4} />
          <AppText color={colors.onPrimary} variant="caption">
            Salvar
          </AppText>
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        {quickValues.map((value) => (
          <Pressable
            accessibilityRole="button"
            key={value}
            onPress={() => {
              const nextValue = String(value);
              setDraftHours(nextValue);
              handleSave(nextValue).catch(console.error);
            }}
            style={({ pressed }) => [
              styles.quickButton,
              { backgroundColor: colors.primarySoft },
              pressed && styles.pressed,
            ]}>
            <AppText color={colors.primary} variant="caption">
              {value}h
            </AppText>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
          <AppText color={colors.danger} variant="caption">
            {error}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    overflow: 'hidden',
    paddingLeft: spacing.xl,
  },
  accent: {
    bottom: 0,
    left: -spacing.xl,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 54,
    paddingHorizontal: spacing.md,
  },
  errorBox: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.5,
  },
});
