/**
 * Micro-interactions Library
 *
 * Reusable animation patterns for:
 * - Button ripple effects
 * - Form field animations
 * - Loading states
 * - Success/error states
 * - Hover feedback
 * - Input focus transitions
 * - Card entrance animations
 * - Skeleton loading shimmer
 *
 * Uses Framer Motion + Tailwind CSS
 */

import { Variants, TargetAndTransition } from 'framer-motion'

/**
 * BUTTON RIPPLE EFFECT
 * Material Design-inspired ripple on click
 */
export const rippleVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 1,
  },
  animate: {
    scale: 4,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
}

export const buttonHoverVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 12,
    },
  },
}

export const buttonPressVariants: Variants = {
  initial: { y: 0 },
  hover: { y: -2 },
  tap: {
    y: 2,
    boxShadow: '0 0px 0px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.1 },
  },
}

/**
 * FORM FIELD ANIMATIONS
 * Focus, blur, and input state transitions
 */
export const inputFocusVariants: Variants = {
  initial: {
    borderColor: 'hsl(var(--input))',
    boxShadow: '0 0 0 0 rgba(79, 110, 247, 0)',
  },
  focus: {
    borderColor: 'hsl(var(--ring))',
    boxShadow: '0 0 0 3px rgba(79, 110, 247, 0.1)',
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
}

export const inputLabelVariants: Variants = {
  initial: {
    y: 0,
    scale: 1,
    color: 'hsl(var(--muted-foreground))',
  },
  focused: {
    y: -24,
    scale: 0.85,
    color: 'hsl(var(--primary))',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
}

export const inputUnderlineVariants: Variants = {
  initial: {
    scaleX: 0,
    originX: 0.5,
  },
  focus: {
    scaleX: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

export const inputErrorVariants: Variants = {
  initial: {
    opacity: 0,
    y: -8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  shake: {
    x: [-4, 4, -4, 4, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
}

/**
 * LOADING STATES
 * Skeletal loaders and animated spinners
 */
export const skeletonShimmerVariants: Variants = {
  initial: {
    backgroundPosition: '-1000px 0',
  },
  animate: {
    backgroundPosition: '1000px 0',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export const pulseDotsVariants: Variants = {
  animate: {
    y: [0, -8, 0],
    opacity: [0.6, 1, 0.6],
  },
}

export const pulseDotsContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
      repeatDelay: 0.5,
    },
  },
}

/**
 * SUCCESS/ERROR STATES
 * Checkmark animations and error feedback
 */
export const successCheckmarkVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 10,
      duration: 0.4,
    },
  },
}

export const successBgVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
}

export const errorPulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
}

export const errorShakeVariants: Variants = {
  animate: {
    x: [-6, 6, -6, 6, -3, 3, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
}

/**
 * HOVER & INTERACTION FEEDBACK
 * Hover effects and touch feedback
 */
export const cardHoverVariants: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  hover: {
    y: -8,
    boxShadow: '0 12px 48px rgba(79, 110, 247, 0.12)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
}

export const glowHoverVariants: Variants = {
  initial: {
    boxShadow: '0 0 0 0px rgba(79, 110, 247, 0.3)',
  },
  hover: {
    boxShadow: '0 0 20px rgba(79, 110, 247, 0.4)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

export const underlineHoverVariants: Variants = {
  initial: {
    width: '0%',
  },
  hover: {
    width: '100%',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
}

/**
 * MODAL & DIALOG ANIMATIONS
 * Entrance and exit animations
 */
export const modalBackdropVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

export const modalContentVariants: Variants = {
  initial: {
    scale: 0.95,
    opacity: 0,
    y: 20,
  },
  animate: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      duration: 0.3,
    },
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
}

/**
 * DROPDOWN & MENU ANIMATIONS
 */
export const dropdownVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
}

export const menuItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -8,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  hover: {
    backgroundColor: 'hsl(var(--accent) / 0.1)',
    paddingLeft: '1rem',
    transition: {
      duration: 0.2,
    },
  },
}

export const menuItemContainerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

/**
 * PAGE TRANSITIONS
 * Entrance animations for page content
 */
export const pageEnterVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
}

export const staggerContainerVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

/**
 * TOAST/NOTIFICATION ANIMATIONS
 */
export const toastEnterVariants: Variants = {
  initial: {
    opacity: 0,
    x: 400,
    y: 0,
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: 400,
    transition: {
      duration: 0.2,
    },
  },
}

/**
 * COLLAPSE/EXPAND ANIMATIONS
 */
export const collapseVariants: Variants = {
  initial: {
    opacity: 1,
    height: 'auto',
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
}

/**
 * BADGE/PILL ANIMATIONS
 */
export const badgePulseVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    boxShadow: [
      '0 0 0 0px rgba(79, 110, 247, 0.7)',
      '0 0 0 8px rgba(79, 110, 247, 0.3)',
      '0 0 0 0px rgba(79, 110, 247, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeOut',
    },
  },
}

/**
 * TEXT ANIMATIONS
 */
export const textRevealVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

export const characterVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
}

export const characterContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

/**
 * UTILITY ANIMATION CONFIGS
 * Reusable transition objects
 */
export const transitions = {
  fast: { duration: 0.15, ease: 'easeOut' as const },
  normal: { duration: 0.3, ease: 'easeOut' as const },
  slow: { duration: 0.5, ease: 'easeOut' as const },
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  },
  springBouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 15,
  },
}

/**
 * PRESET ANIMATIONS
 * Complete animation sequences
 */
export const animationPresets = {
  /**
   * Button with ripple effect and press animation
   */
  buttonPress: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
  },

  /**
   * Card elevation on hover
   */
  cardElevate: {
    whileHover: {
      y: -8,
      boxShadow: '0 12px 48px rgba(79, 110, 247, 0.12)',
    },
  },

  /**
   * Input field focus state
   */
  inputFocus: {
    variants: {
      focused: {
        boxShadow: '0 0 0 3px rgba(79, 110, 247, 0.1)',
      },
      unfocused: {
        boxShadow: '0 0 0 0 rgba(79, 110, 247, 0)',
      },
    },
  },

  /**
   * Error shake animation
   */
  errorShake: {
    animate: {
      x: [-6, 6, -6, 6, -3, 3, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut',
      },
    },
  },

  /**
   * Success checkmark pop
   */
  successPop: {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 15,
    },
  },

  /**
   * Loading spinner
   */
  loadingSpinner: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },

  /**
   * Pulse animation
   */
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },

  /**
   * Skeleton shimmer
   */
  skeletonShimmer: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  },
}
