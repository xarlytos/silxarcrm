// Sistema tipográfico — Groomly Mobile v2.0
import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  score: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },
  scoreSmall: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    lineHeight: 12,
  },
};

export type TypographyStyle = keyof typeof typography;
