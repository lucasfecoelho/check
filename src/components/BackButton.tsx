import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { radius, useThemeColors } from '@/theme';

export function BackButton() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Voltar"
      accessibilityRole="button"
      onPress={() => router.back()}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primarySoft },
        pressed && styles.pressed,
      ]}>
      <ArrowLeft color={colors.primary} size={22} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
});
