// Sistema de radios de borde — Groomly Mobile v2.0

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export type RadiusVariant = keyof typeof radius;
