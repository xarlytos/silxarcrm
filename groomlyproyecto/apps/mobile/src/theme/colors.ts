// Sistema de tokens de color — Groomly Mobile v2.0
// Paleta: Dark-first con acento cian

export const palette = {
  // Backgrounds
  background: '#0A0B10',
  surface: '#14161F',
  surfaceElevated: '#1C1E2A',
  surfaceHighlight: '#252836',

  // Primary — Cian
  primary: '#00D4FF',
  primaryLight: '#33DDFF',
  primaryDark: '#00A8CC',
  primaryGlow: 'rgba(0, 212, 255, 0.08)',

  // Accent — Púrpura
  accent: '#7B61FF',
  accentGlow: 'rgba(123, 97, 255, 0.08)',

  // Text
  text: '#FFFFFF',
  textSecondary: '#9AA3B2',
  textMuted: '#5A616D',

  // Borders
  border: '#252836',
  borderLight: '#2E2E42',

  // Semantic
  success: '#00D4FF',
  error: '#FF4D6D',
  warning: '#FFD740',
  info: '#7B61FF',

  // Estado de citas
  status: {
    confirmada: '#00D4FF',
    enCurso: '#00FF88',
    pendiente: '#FFD740',
    cancelada: '#FF4D6D',
    completada: '#5A616D',
  },

  // Light mode (derivados)
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#E8EBF0',
    surfaceHighlight: '#DEE2E9',
    primary: '#00A8CC',
    text: '#0A0B10',
    textSecondary: '#5A616D',
    textMuted: '#9AA3B2',
    border: '#DEE2E9',
    borderLight: '#E8EBF0',
  },
} as const;

// Gradient presets
export const gradients = {
  primary: ['#00D4FF', '#7B61FF'] as const,
  primaryLight: ['#33DDFF', '#9B85FF'] as const,
  hero: ['rgba(0, 212, 255, 0.15)', 'rgba(123, 97, 255, 0.05)', 'transparent'] as const,
  legibility: ['transparent', 'rgba(10, 11, 16, 0.8)', 'rgba(10, 11, 16, 1)'] as const,
  surface: ['#14161F', '#1C1E2A'] as const,
} as const;

// Glow colors
export const glows = {
  primary: 'rgba(0, 212, 255, 0.15)',
  accent: 'rgba(123, 97, 255, 0.15)',
  success: 'rgba(0, 255, 136, 0.15)',
  error: 'rgba(255, 77, 109, 0.15)',
} as const;
