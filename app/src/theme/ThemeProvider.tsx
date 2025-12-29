import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Appearance } from 'react-native';

import { darkPalette, lightPalette, radius, spacing, typography } from './tokens';

type ThemeMode = 'light' | 'dark';

const createTheme = (mode: ThemeMode) => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  return {
    mode,
    colors: palette,
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
  theme: createTheme(defaultMode),
  mode: defaultMode,
  setMode: () => {},
  toggleMode: () => {},
});

export const AppThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({
      theme: createTheme(mode),
      mode,
      setMode,
      toggleMode,
    }),
    [mode, toggleMode]
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
