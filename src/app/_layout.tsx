import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { initDatabase } from '@/database';
import { AppThemeProvider, useAppTheme } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    console.log('[Check] RootLayout mounted');
    console.log('[Check] notification handler deferred until notifications are used');
    console.log('[Check] initializing database from RootLayout');
    initDatabase().catch((error) => {
      console.error('[Check] Failed to initialize database from RootLayout', error);
    });
  }, []);

  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { colors, preference } = useAppTheme();
  const navigationTheme = {
    ...DefaultTheme,
    dark: preference === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={preference === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
