import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import { darkPalette, lightPalette, radius, spacing, typography } from './tokens';
import { usePreferences, accentColors, heroColors } from '@/hooks/usePreferences';

type ThemeMode = 'light' | 'dark';

const createTheme = (mode: ThemeMode, accentColor: string, heroColor: string) => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const accent = accentColors[accentColor as keyof typeof accentColors];
  const hero = heroColors[heroColor as keyof typeof heroColors];
  
  return {
    mode,
    colors: {
      ...palette,
      accent: accent ? accent[mode] : palette.accent,
      heroGradient: hero ? hero[mode] : (mode === 'dark' ? ['#1e1b4b', '#312e81'] : ['#6366f1', '#8b5cf6']),
    },
    spacing,
    radius,
    typography,
  };
};

const defaultMode: ThemeMode = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

type ThemeContextValue = {
  theme: ReturnType<typeof createTheme>;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: createTheme(defaultMode, 'purple', 'purple'),
  mode: defaultMode,
  setMode: () => {},
  toggleMode: () => {},
});

export const AppThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const { preferences } = usePreferences();
  
  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      theme: createTheme(mode, preferences.accentColor, preferences.heroColor),
      mode,
      setMode,
      toggleMode,
    }),
    [mode, preferences.accentColor, preferences.heroColor, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
};
