import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';

const THEME_KEY = 'groomly-theme';
export type ThemeMode = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    storage.getItemAsync(THEME_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setThemeState(saved);
      }
    });
  }, []);

  const setTheme = useCallback(async (value: ThemeMode) => {
    setThemeState(value);
    await storage.setItemAsync(THEME_KEY, value);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    await setTheme(next);
  }, [theme, setTheme]);

  const isDark = theme === 'dark';

  return { theme, setTheme, toggleTheme, isDark };
}
