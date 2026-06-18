import { Text, TextProps, StyleSheet } from 'react-native';

import { typography, useThemeColors } from '@/theme';

type AppTextVariant = 'heading' | 'title' | 'bodyLarge' | 'body' | 'bodyStrong' | 'caption';

type AppTextProps = TextProps & {
  color?: string;
  variant?: AppTextVariant;
};

export function AppText({
  children,
  color,
  style,
  variant = 'body',
  ...props
}: AppTextProps) {
  const colors = useThemeColors();

  return (
    <Text style={[styles.base, styles[variant], { color: color ?? colors.text }, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
  heading: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.heading,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.title,
  },
  body: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.body,
  },
  bodyLarge: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.bodyLarge,
  },
  bodyStrong: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.body,
  },
  caption: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.caption,
  },
});
