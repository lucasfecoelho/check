import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { CategoryIcon } from './CategoryIcon';

type CategoryBadgeProps = {
  color: string;
  icon: string;
  label: string;
  tone?: 'soft' | 'plain';
};

export function CategoryBadge({ color, icon, label, tone = 'soft' }: CategoryBadgeProps) {
  return (
    <View style={[styles.container, tone === 'soft' && { backgroundColor: `${color}14` }]}>
      <CategoryIcon color={color} name={icon} size={14} />
      <AppText color={tone === 'soft' ? colors.text : colors.textMuted} numberOfLines={1} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
  },
});
