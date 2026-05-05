import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';

type EmptyStateProps = {
  description: string;
  icon: LucideIcon;
  iconBackgroundColor?: string;
  iconColor?: string;
  title: string;
};

export function EmptyState({
  description,
  icon: Icon,
  iconBackgroundColor,
  iconColor,
  title,
}: EmptyStateProps) {
  const colors = useThemeColors();
  const resolvedIconBackground = iconBackgroundColor ?? colors.primarySoft;
  const resolvedIconColor = iconColor ?? colors.primary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: resolvedIconBackground }]}>
        <Icon color={resolvedIconColor} size={28} strokeWidth={2} />
      </View>
      <View style={styles.copy}>
        <AppText style={styles.center} variant="bodyStrong">
          {title}
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          {description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.xl,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  copy: {
    gap: spacing.xs,
  },
  center: {
    textAlign: 'center',
  },
});
