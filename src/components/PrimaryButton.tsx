import { LucideIcon } from 'lucide-react-native';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  icon?: LucideIcon;
  label: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ disabled, icon: Icon, label, style, ...props }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}>
      <View style={styles.content}>
        {Icon ? <Icon color={colors.surface} size={18} strokeWidth={2.4} /> : null}
        <AppText color={colors.surface} variant="bodyStrong">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.48,
  },
});
