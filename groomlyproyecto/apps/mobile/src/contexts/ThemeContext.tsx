import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@/lib/storage';
import { palette } from '@/theme/colors';

const THEME_KEY = 'groomly-theme';

type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Backgrounds
  background: string;
  card: string;
  elevated: string;
  input: string;
  surface: string;
  surfaceElevated: string;
  surfaceHighlight: string;
  // Text
  text: string;
  textMuted: string;
  textInverse: string;
  textSecondary: string;
  // Borders
  border: string;
  divider: string;
  // Status
  statusBar: 'dark-content' | 'light-content';
  // Semantic
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  // Glows
  primaryGlow: string;
  accentGlow: string;
  // Backward compatibility (legacy)
  primaryText: string;
  primaryBg: string;
}

const darkColors: ThemeColors = {
  background: palette.background,
  card: palette.surface,
  elevated: palette.surfaceElevated,
  input: palette.surfaceElevated,
  surface: palette.surface,
  surfaceElevated: palette.surfaceElevated,
  surfaceHighlight: palette.surfaceHighlight,
  text: palette.text,
  textMuted: palette.textMuted,
  textInverse: '#0A0B10',
  textSecondary: palette.textSecondary,
  border: palette.border,
  divider: palette.borderLight,
  statusBar: 'light-content',
  primary: palette.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  accent: palette.accent,
  success: palette.status.enCurso,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  primaryGlow: palette.primaryGlow,
  accentGlow: palette.accentGlow,
  // Backward compatibility
  primaryText: palette.primary,
  primaryBg: `${palette.primary}20`,
};

const lightColors: ThemeColors = {
  background: palette.light.background,
  card: palette.light.surface,
  elevated: palette.light.surfaceElevated,
  input: palette.light.surfaceElevated,
  surface: palette.light.surface,
  surfaceElevated: palette.light.surfaceElevated,
  surfaceHighlight: palette.light.surfaceHighlight,
  text: palette.light.text,
  textMuted: palette.light.textMuted,
  textInverse: '#FFFFFF',
  textSecondary: palette.light.textSecondary,
  border: palette.light.border,
  divider: palette.light.borderLight,
  statusBar: 'dark-content',
  primary: palette.light.primary,
  primaryLight: palette.primaryLight,
  primaryDark: palette.primaryDark,
  accent: palette.accent,
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  primaryGlow: 'rgba(0, 168, 204, 0.08)',
  accentGlow: 'rgba(123, 97, 255, 0.08)',
  // Backward compatibility
  primaryText: palette.light.primary,
  primaryBg: `${palette.light.primary}20`,
};

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark'); // Default dark-first

  useEffect(() => {
    storage.getItemAsync(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const isDark =
    mode === 'system' ? systemScheme !== 'light' : mode === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await storage.setItemAsync(THEME_KEY, newMode);
  };

  const toggle = async () => {
    const next = isDark ? 'light' : 'dark';
    await setMode(next);
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode, toggle, toggleTheme: toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Helper para clases condicionales con dark mode
export function useThemeClasses() {
  const { isDark, colors } = useTheme();
  return {
    isDark,
    colors,
    bg: isDark ? 'bg-[#0A0B10]' : 'bg-[#F5F7FA]',
    bgCard: isDark ? 'bg-[#14161F]' : 'bg-white',
    bgElevated: isDark ? 'bg-[#1C1E2A]' : 'bg-[#E8EBF0]',
    bgInput: isDark ? 'bg-[#1C1E2A]' : 'bg-[#E8EBF0]',
    text: isDark ? 'text-white' : 'text-[#0A0B10]',
    textMuted: isDark ? 'text-[#5A616D]' : 'text-[#9AA3B2]',
    textSecondary: isDark ? 'text-[#9AA3B2]' : 'text-[#5A616D]',
    border: isDark ? 'border-[#252836]' : 'border-[#DEE2E9]',
    borderInput: isDark ? 'border-[#2E2E42]' : 'border-[#D5D5DE]',
    statusBar: colors.statusBar,
  };
}
