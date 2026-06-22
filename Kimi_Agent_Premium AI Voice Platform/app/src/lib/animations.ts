import { Variants } from 'framer-motion'

/**
 * Global Animation Utilities
 * Consistent animation definitions for use throughout the app
 */

// ============================================
// EASING FUNCTIONS
// ============================================

export const easing = {
  // Smooth, natural easing
  easeOut: [0.25, 0.46, 0.45, 0.94],
  easeIn: [0.4, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],

  // Sharp, snappy easing
  sharp: [0.7, 0, 0.84, 0],
  snappy: [0.1, 0.8, 0.2, 1],

  // Custom curves
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.175, 0.885, 0.32, 1.275],
  smooth: [0.33, 0.66, 0.66, 1],
} as const

// ============================================
// DURATION CONSTANTS (milliseconds)
// ============================================

export const duration = {
  fastest: 150,
  fast: 200,
  base: 300,
  slow: 500,
  slowest: 700,
} as const

// ============================================
// SPACING RHYTHM (3px base unit)
// ============================================

export const spacing = {
  xs: '3px', // 3px (1 unit)
  sm: '6px', // 6px (2 units)
  md: '12px', // 12px (4 units)
  lg: '16px', // 16px (5.33 units) - standard padding
  xl: '24px', // 24px (8 units)
  '2xl': '32px', // 32px (10.66 units)
  '3xl': '48px', // 48px (16 units)
} as const

// ============================================
// CONTAINER ANIMATIONS
// ============================================

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export const containerWithFastStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

// ============================================
// ITEM ANIMATIONS
// ============================================

export const itemFadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.base / 1000, ease: easing.easeOut },
  },
}

export const itemSlideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

export const itemSlideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

export const itemSlideLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

export const itemSlideRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

export const itemScale: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

export const itemRotateIn: Variants = {
  hidden: { opacity: 0, rotate: -10 },
  visible: {
    opacity: 1,
    rotate: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

// ============================================
// PAGE TRANSITION ANIMATIONS
// ============================================

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: duration.fast / 1000,
      ease: easing.sharp,
    },
  },
}

export const pageTransitionFade: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.fast / 1000 },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast / 1000 },
  },
}

// ============================================
// MODAL/DIALOG ANIMATIONS
// ============================================

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.fast / 1000 },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast / 1000 },
  },
}

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 16,
    transition: {
      duration: duration.fast / 1000,
      ease: easing.sharp,
    },
  },
}

// ============================================
// HOVER/INTERACTION ANIMATIONS
// ============================================

export const hoverLift: Variants = {
  initial: { y: 0 },
  hover: {
    y: -4,
    transition: { duration: duration.fast / 1000 },
  },
}

export const hoverScale: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: duration.fast / 1000 },
  },
}

export const hoverScaleSmall: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: duration.fast / 1000 },
  },
}

export const hoverBrighten: Variants = {
  initial: { opacity: 1 },
  hover: {
    opacity: 1.1,
    transition: { duration: duration.fast / 1000 },
  },
}

// ============================================
// SCROLL-BASED ANIMATIONS
// ============================================

export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.base / 1000,
      ease: easing.easeOut,
    },
  },
}

export const scrollFadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: duration.slow / 1000,
      ease: easing.easeOut,
    },
  },
}

// ============================================
// LOADING ANIMATIONS
// ============================================

export const loadingPulse: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export const loadingSpinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a staggered animation for lists
 */
export function createStaggerAnimation(
  delayIncrement = 0.05,
  maxDelay = 0.3
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delayIncrement,
        delayChildren: Math.min(delayIncrement * 2, maxDelay),
      },
    },
  }
}

/**
 * Create a delay for an animation
 */
export function withDelay(delayMs: number) {
  return {
    delay: delayMs / 1000,
  }
}

/**
 * Combine animation variants
 */
export function combineVariants(...variants: Variants[]): Variants {
  return variants.reduce((acc, variant) => ({ ...acc, ...variant }), {})
}

/**
 * Create spring animation config
 */
export const springConfig = {
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 10,
  },
  smooth: {
    type: 'spring' as const,
    stiffness: 100,
    damping: 15,
  },
  molasses: {
    type: 'spring' as const,
    stiffness: 40,
    damping: 20,
  },
} as const
