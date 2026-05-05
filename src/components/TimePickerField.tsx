import { Clock3 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { TimePickerModal } from './TimePickerModal';

type TimePickerFieldProps = {
  defaultTime: string;
  onChange: (time: string) => void;
  value: string;
};

export function TimePickerField({ defaultTime, onChange, value }: TimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayValue = value || defaultTime;
  const isUsingDefault = !value;

  function handleConfirm(time: string) {
    onChange(time);
    setIsOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.fieldButton, pressed && styles.pressed]}>
        <Clock3 color={colors.textMuted} size={18} strokeWidth={2.2} />
        <View style={styles.fieldCopy}>
          <AppText color={isUsingDefault ? colors.textMuted : colors.text} variant="bodyStrong">
            {displayValue}
          </AppText>
          {isUsingDefault ? (
            <AppText color={colors.textSoft} variant="caption">
              Padrão
            </AppText>
          ) : null}
        </View>
      </Pressable>

      <TimePickerModal
        initialValue={displayValue}
        onCancel={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        visible={isOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fieldButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  fieldCopy: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
