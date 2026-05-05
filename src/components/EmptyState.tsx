import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type EmptyStateProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function EmptyState({ description, icon: Icon, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon color={colors.primary} size={28} strokeWidth={2} />
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
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
