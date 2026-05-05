import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type SectionHeaderProps = {
  action?: ReactNode;
  count?: number;
  subtitle?: string;
  title: string;
};

export function SectionHeader({ action, count, subtitle, title }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <AppText variant="title">{title}</AppText>
          {typeof count === 'number' ? (
            <View style={styles.badge}>
              <AppText color={colors.primary} variant="caption">
                {count}
              </AppText>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <AppText color={colors.textMuted} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
