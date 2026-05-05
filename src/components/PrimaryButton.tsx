import { LucideIcon } from 'lucide-react-native';
import { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  icon?: LucideIcon;
  label: string;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ disabled, icon: Icon, label, style, ...props }: PrimaryButtonProps) {
  const colors = useThemeColors();
  const scale = useRef(new Animated.Value(1)).current;

  function animatePress(toValue: number) {
    Animated.timing(scale, {
      duration: 110,
      toValue,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        {...props}
        onPressIn={(event) => {
          animatePress(0.98);
          props.onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animatePress(1);
          props.onPressOut?.(event);
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.content}>
          {Icon ? <Icon color={colors.onPrimary} size={18} strokeWidth={2.4} /> : null}
          <AppText color={colors.onPrimary} variant="bodyStrong">
            {label}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
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
