/**
 * Design Tokens System v2.0
 *
 * Enhanced design system for VoiceAgent OS
 * Includes:
 * - Expanded color palette with depth and contrast
 * - Professional gradient combinations
 * - Typography hierarchy
 * - Shadow & blur effects system
 * - Spacing scale
 * - Motion/animation tokens
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

/**
 * Core Dark Theme Colors
 * Maintained brand identity while adding depth and contrast
 */
export const colors = {
  // Primary Background Hierarchy
  background: {
    darkest: '#02020A',  // New: Deepest blacks for max depth
    primary: '#06060A',  // Original: Main background
    elevated: '#0C0C14', // Original: Elevated surfaces
    card: '#11111A',     // Original: Card base
    cardHover: '#181825', // Original: Card hover state
    overlay: '#06060A99', // New: Semi-transparent overlay
  },

  // Secondary Background (Depth Layers)
  surface: {
    level1: '#14141F',  // New: Subtle elevation
    level2: '#1A1A26',  // New: Medium elevation
    level3: '#252535',  // New: High elevation
    accent: '#2D2D3D',  // New: Accent base
  },

  // Text Colors - Full Hierarchy
  text: {
    primary: '#FFFFFF',      // Original: Main text
    secondary: '#8A8A9A',    // Original: Secondary text
    tertiary: '#6B6B7C',     // New: Tertiary text
    muted: '#5A5A6A',        // Original: Muted text
    disabled: '#3A3A4A',     // New: Disabled state
    inverse: '#06060A',      // New: For light backgrounds
  },

  // Brand Color Palette - Expanded
  brand: {
    // Blue - Primary Brand
    blue: {
      50: '#F0F3FF',   // New: Lightest (light mode)
      100: '#E0E7FF',  // New
      200: '#C7D2FE',  // New
      300: '#A5B4FC',  // New
      400: '#818CF8',  // New
      500: '#6366F1',  // New: Mid tone
      600: '#4F46E5',  // New: Saturated
      700: '#4F6EF7',  // Original: Primary brand blue
      800: '#3730A3',  // New
      900: '#312E81',  // New: Darkest
      950: '#1E1B4B',  // New: Ultra dark
    },

    // Violet - Secondary Brand
    violet: {
      50: '#F5F3FF',   // New
      100: '#EDE9FE',  // New
      200: '#DDD6FE',  // New
      300: '#C4B5FD',  // New
      400: '#A78BFA',  // New
      500: '#8B5CF6',  // New
      600: '#7C3AED',  // New: Saturated
      700: '#7B61FF',  // Original: Accent violet
      800: '#6D28D9',  // New
      900: '#581C87',  // New
      950: '#3F0F64',  // New: Ultra dark
    },

    // Cyan - Accent
    cyan: {
      50: '#ECFFFF',   // New
      100: '#CFFAFE',  // New
      200: '#A5F3FC',  // New
      300: '#67E8F9',  // New
      400: '#22D3EE',  // Original: Cyan accent
      500: '#06B6D4',  // New: Darker cyan
      600: '#0891B2',  // New
      700: '#0E7490',  // New
      800: '#155E75',  // New
      900: '#164E63',  // New
    },
  },

  // Semantic Colors
  semantic: {
    success: {
      light: '#D1FAE5',  // New
      main: '#10B981',   // Original
      dark: '#059669',   // New
      darkest: '#047857', // New
    },
    warning: {
      light: '#FEF3C7',  // New
      main: '#F59E0B',   // Original
      dark: '#D97706',   // New
      darkest: '#B45309', // New
    },
    error: {
      light: '#FEE2E2',  // New
      main: '#EF4444',   // Original
      dark: '#DC2626',   // New
      darkest: '#991B1B', // New
    },
    info: {
      light: '#DBEAFE',  // New
      main: '#3B82F6',   // Original
      dark: '#1D4ED8',   // New
      darkest: '#1E40AF', // New
    },
  },

  // Border Colors
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',  // Original
    default: 'rgba(255, 255, 255, 0.12)', // Original
    hover: 'rgba(255, 255, 255, 0.16)',   // New
    active: 'rgba(255, 255, 255, 0.24)',  // New
    focus: 'rgba(79, 110, 247, 0.5)',     // New: Brand blue
  },

  // Light Mode Support
  light: {
    background: '#F8F8FB',
    backgroundSecondary: '#FFFFFF',
    text: '#0A0A12',
    textSecondary: '#5A5A6A',
    border: 'rgba(0, 0, 0, 0.08)',
  },
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

/**
 * Professional gradient combinations for UI elements
 * All designed to work with dark theme while maintaining contrast
 */
export const gradients = {
  // Brand Gradients
  hero: 'linear-gradient(180deg, #06060A 0%, #0A0A18 50%, #06060A 100%)',

  // Primary Action Gradients
  accent: 'linear-gradient(135deg, #4F6EF7 0%, #7B61FF 100%)',
  accentReverse: 'linear-gradient(135deg, #7B61FF 0%, #4F6EF7 100%)',

  // Card Gradients (Subtle)
  card: 'linear-gradient(180deg, rgba(79, 110, 247, 0.08) 0%, rgba(123, 97, 255, 0.04) 100%)',
  cardLight: 'linear-gradient(180deg, rgba(79, 110, 247, 0.12) 0%, rgba(123, 97, 255, 0.06) 100%)',

  // Extended Brand Gradients
  blueToViolet: 'linear-gradient(135deg, #4F6EF7 0%, #8B5CF6 100%)',
  violetToCyan: 'linear-gradient(135deg, #7B61FF 0%, #22D3EE 100%)',
  cyanToBlue: 'linear-gradient(135deg, #22D3EE 0%, #4F6EF7 100%)',

  // Success Gradients
  successGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',

  // Warning Gradients
  warningGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',

  // Error Gradients
  errorGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',

  // Advanced Gradients
  aurora: 'radial-gradient(ellipse 80% 50% at 30% 50%, rgba(79, 110, 247, 0.15) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 70% 30%, rgba(123, 97, 255, 0.1) 0%, transparent 50%)',

  // Subtle Direction Gradients
  toBottom: 'linear-gradient(to bottom, rgba(79, 110, 247, 0.1) 0%, transparent 100%)',
  toRight: 'linear-gradient(to right, rgba(79, 110, 247, 0.1) 0%, transparent 100%)',

  // Angle Gradients
  angle45: 'linear-gradient(45deg, rgba(79, 110, 247, 0.15) 0%, transparent 100%)',
  angle135: 'linear-gradient(135deg, rgba(79, 110, 247, 0.15) 0%, transparent 100%)',
  angle225: 'linear-gradient(225deg, rgba(79, 110, 247, 0.15) 0%, transparent 100%)',
  angle315: 'linear-gradient(315deg, rgba(79, 110, 247, 0.15) 0%, transparent 100%)',
} as const;

// ============================================================================
// TYPOGRAPHY HIERARCHY
// ============================================================================

/**
 * Complete typography scale with semantic naming
 * Based on Inter font family at various weights
 */
export const typography = {
  // Display Sizes (Hero text)
  display: {
    xl: {
      fontSize: '56px',
      lineHeight: '67.2px',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    lg: {
      fontSize: '48px',
      lineHeight: '57.6px',
      fontWeight: 800,
      letterSpacing: '-0.015em',
    },
    md: {
      fontSize: '40px',
      lineHeight: '48px',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
  },

  // Heading Sizes
  heading: {
    xl: {
      fontSize: '32px',
      lineHeight: '38.4px',
      fontWeight: 700,
      letterSpacing: '-0.008em',
    },
    lg: {
      fontSize: '28px',
      lineHeight: '33.6px',
      fontWeight: 700,
      letterSpacing: '-0.005em',
    },
    md: {
      fontSize: '24px',
      lineHeight: '28.8px',
      fontWeight: 600,
      letterSpacing: '0em',
    },
    sm: {
      fontSize: '20px',
      lineHeight: '24px',
      fontWeight: 600,
      letterSpacing: '0em',
    },
    xs: {
      fontSize: '18px',
      lineHeight: '21.6px',
      fontWeight: 600,
      letterSpacing: '0em',
    },
  },

  // Body Sizes
  body: {
    xl: {
      fontSize: '18px',
      lineHeight: '27px',
      fontWeight: 400,
      letterSpacing: '0em',
    },
    lg: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
      letterSpacing: '0em',
    },
    md: {
      fontSize: '15px',
      lineHeight: '22.5px',
      fontWeight: 400,
      letterSpacing: '0em',
    },
    sm: {
      fontSize: '14px',
      lineHeight: '21px',
      fontWeight: 400,
      letterSpacing: '0em',
    },
    xs: {
      fontSize: '13px',
      lineHeight: '19.5px',
      fontWeight: 400,
      letterSpacing: '0em',
    },
  },

  // Label/Caption Sizes
  label: {
    lg: {
      fontSize: '14px',
      lineHeight: '16.8px',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    md: {
      fontSize: '12px',
      lineHeight: '14.4px',
      fontWeight: 600,
      letterSpacing: '0.03em',
    },
    sm: {
      fontSize: '11px',
      lineHeight: '13.2px',
      fontWeight: 600,
      letterSpacing: '0.05em',
    },
  },

  // Mono/Code Sizes
  code: {
    lg: {
      fontSize: '14px',
      lineHeight: '21px',
      fontWeight: 500,
      fontFamily: "'JetBrains Mono', monospace",
    },
    md: {
      fontSize: '13px',
      lineHeight: '19.5px',
      fontWeight: 500,
      fontFamily: "'JetBrains Mono', monospace",
    },
    sm: {
      fontSize: '12px',
      lineHeight: '18px',
      fontWeight: 500,
      fontFamily: "'JetBrains Mono', monospace",
    },
  },
} as const;

// ============================================================================
// SHADOW & BLUR EFFECTS
// ============================================================================

/**
 * Comprehensive shadow system for depth and elevation
 * Includes blur effects for glassmorphic components
 */
export const shadows = {
  // Box Shadows (Elevation)
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  xl: '0 12px 48px rgba(0, 0, 0, 0.6)',
  '2xl': '0 20px 64px rgba(0, 0, 0, 0.7)',

  // Glow Shadows (Brand Color)
  glow: '0 0 20px rgba(79, 110, 247, 0.3)',
  glowLg: '0 0 40px rgba(79, 110, 247, 0.4)',
  glowXl: '0 0 60px rgba(79, 110, 247, 0.5)',

  // Color-Specific Glows
  glowViolet: '0 0 20px rgba(123, 97, 255, 0.3)',
  glowCyan: '0 0 20px rgba(34, 211, 238, 0.3)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.3)',
  glowWarning: '0 0 20px rgba(245, 158, 11, 0.3)',
  glowError: '0 0 20px rgba(239, 68, 68, 0.3)',

  // Card Shadows
  cardHover: '0 12px 48px rgba(79, 110, 247, 0.12)',
  cardDefault: '0 4px 12px rgba(0, 0, 0, 0.2)',

  // Inset Shadows (for depth)
  insetSm: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)',
  insetMd: 'inset 0 1px 3px rgba(255, 255, 255, 0.08)',
  insetLg: 'inset 0 2px 4px rgba(255, 255, 255, 0.1)',
} as const;

/**
 * Blur Effects for Glassmorphism
 */
export const blur = {
  none: 'blur(0px)',
  xs: 'blur(4px)',
  sm: 'blur(8px)',
  md: 'blur(12px)',
  lg: 'blur(16px)',
  xl: 'blur(24px)',
  '2xl': 'blur(32px)',
} as const;

/**
 * Backdrop Blur for Semi-transparent Elements
 */
export const backdropBlur = {
  none: 'backdrop-blur(0px)',
  xs: 'backdrop-blur(4px)',
  sm: 'backdrop-blur(8px)',
  md: 'backdrop-blur(12px)',
  lg: 'backdrop-blur(16px)',
  xl: 'backdrop-blur(24px)',
  '2xl': 'backdrop-blur(32px)',
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

/**
 * Consistent spacing scale based on 4px grid
 * Used for padding, margins, gaps, and positioning
 */
export const spacing = {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
  '28': '112px',
  '32': '128px',
  '36': '144px',
  '40': '160px',
  '44': '176px',
  '48': '192px',
  '52': '208px',
  '56': '224px',
  '60': '240px',
  '64': '256px',
} as const;

/**
 * Semantic spacing for common patterns
 */
export const spacingVariants = {
  // Component Padding
  component: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  // Section Padding
  section: {
    xs: '24px',
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '80px',
  },

  // Gap Sizes
  gap: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
  },
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

/**
 * Comprehensive border radius scale
 */
export const borderRadius = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// ============================================================================
// MOTION & ANIMATION
// ============================================================================

/**
 * Animation timing and easing functions
 */
export const motion = {
  // Durations
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '800ms',
  },

  // Easing Functions
  easing: {
    // Linear
    linear: 'cubic-bezier(0, 0, 1, 1)',

    // Standard
    ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',

    // Optimized
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    smoothIn: 'cubic-bezier(0.4, 0, 0.6, 1)',
    smoothOut: 'cubic-bezier(0.3, 0, 0.8, 0.15)',

    // Spring-like
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Common Animation Combinations
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

/**
 * Pre-composed tokens for common components
 */
export const components = {
  // Button Variants
  button: {
    primary: {
      background: gradients.accent,
      color: colors.text.primary,
      shadow: shadows.glow,
      padding: spacingVariants.component.md,
      borderRadius: borderRadius.full,
    },
    secondary: {
      background: 'transparent',
      color: colors.text.primary,
      border: colors.border.default,
      padding: spacingVariants.component.md,
      borderRadius: borderRadius.full,
    },
    ghost: {
      background: 'transparent',
      color: colors.text.primary,
      padding: spacingVariants.component.md,
      borderRadius: borderRadius.lg,
    },
  },

  // Card Variants
  card: {
    default: {
      background: colors.background.card,
      border: colors.border.subtle,
      borderRadius: borderRadius['2xl'],
      shadow: shadows.cardDefault,
      padding: spacingVariants.component.lg,
    },
    elevated: {
      background: colors.surface.level2,
      border: colors.border.default,
      borderRadius: borderRadius['2xl'],
      shadow: shadows.lg,
      padding: spacingVariants.component.lg,
    },
    interactive: {
      background: colors.background.card,
      border: colors.border.subtle,
      borderRadius: borderRadius['2xl'],
      shadow: shadows.cardDefault,
      padding: spacingVariants.component.lg,
      cursor: 'pointer',
    },
  },

  // Input Fields
  input: {
    background: colors.surface.level1,
    border: colors.border.default,
    borderRadius: borderRadius.lg,
    padding: spacingVariants.component.md,
    color: colors.text.primary,
    focusBorder: colors.border.focus,
  },

  // Text Styles
  text: {
    hero: {
      ...typography.display.xl,
      color: colors.text.primary,
    },
    heading1: {
      ...typography.heading.xl,
      color: colors.text.primary,
    },
    body: {
      ...typography.body.lg,
      color: colors.text.secondary,
    },
    caption: {
      ...typography.label.md,
      color: colors.text.muted,
    },
  },
} as const;

// ============================================================================
// EXPORT COMPLETE DESIGN SYSTEM
// ============================================================================

/**
 * Complete design system object for easy importing
 */
export const designTokens = {
  colors,
  gradients,
  typography,
  shadows,
  blur,
  backdropBlur,
  spacing,
  spacingVariants,
  borderRadius,
  motion,
  components,
} as const;

// Export type for TypeScript
export type DesignTokens = typeof designTokens;
