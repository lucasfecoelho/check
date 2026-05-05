import { Text, TextProps, StyleSheet } from 'react-native';

import { colors, typography } from '@/theme';

type AppTextVariant = 'heading' | 'title' | 'body' | 'bodyStrong' | 'caption';

type AppTextProps = TextProps & {
  color?: string;
  variant?: AppTextVariant;
};

export function AppText({
  children,
  color = colors.text,
  style,
  variant = 'body',
  ...props
}: AppTextProps) {
  return (
    <Text style={[styles.base, styles[variant], { color }, style]} {...props}>
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
