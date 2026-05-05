import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getSettings, initDatabase, updateSetting } from '@/database';

import { darkColors, lightColors, ThemeColors, ThemePreference } from './colors';

type AppThemeContextValue = {
  colors: ThemeColors;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = {
  children: ReactNode;
};

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    let isMounted = true;

    async function loadThemePreference() {
      try {
        await initDatabase();
        const settings = await getSettings();
        const savedTheme = settings.find((setting) => setting.key === 'theme')?.value;

        if (isMounted) {
          setPreferenceState(savedTheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.warn('[Check][theme] Failed to load theme preference', error);
      }
    }

    loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await initDatabase();
    await updateSetting('theme', nextPreference);
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      colors: preference === 'dark' ? darkColors : lightColors,
      preference,
      setPreference,
    }),
    [preference, setPreference]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}

export function useThemeColors() {
  return useAppTheme().colors;
}
