/**
 * Animation Presets & Configurations
 * Ready-to-use animation combinations for common patterns
 */

import { Variants } from 'framer-motion'
import {
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  slideUp,
  slideDown,
  scaleInCenter,
  containerVariants,
  itemVariants,
} from './useAnimations'

// ============================================================================
// PAGE TRANSITION PRESETS
// ============================================================================

/**
 * Page entrance animation - fade in from bottom
 */
export const pageEnter: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

/**
 * Page exit animation - fade out upward
 */
export const pageExit: Variants = {
  exit: { opacity: 0, y: 50, transition: { duration: 0.3 } },
}

// ============================================================================
// STAGGER PRESETS
// ============================================================================

/**
 * Fast stagger for small lists (5-10 items)
 */
export const staggerFast = (childVariant = fadeInUp) =>
  containerVariants(0.08, childVariant)

/**
 * Medium stagger for regular lists (10-20 items)
 */
export const staggerMedium = (childVariant = fadeInUp) =>
  containerVariants(0.1, childVariant)

/**
 * Slow stagger for large lists (20+ items) - better performance
 */
export const staggerSlow = (childVariant = fadeInUp) =>
  containerVariants(0.05, childVariant)

/**
 * Very slow stagger for huge lists (100+ items)
 */
export const staggerVerySlow = (childVariant = fadeInUp) =>
  containerVariants(0.02, childVariant)

// ============================================================================
// HERO SECTION PRESETS
// ============================================================================

/**
 * Hero headline with scale and fade
 */
export const heroHeadline: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

/**
 * Hero subheadline with delay
 */
export const heroSubheadline: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.3, ease: 'easeOut' },
  },
}

/**
 * Hero CTA button
 */
export const heroCTA: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, delay: 0.6, ease: 'easeOut' },
  },
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95 },
}

// ============================================================================
// CARD & GRID PRESETS
// ============================================================================

/**
 * Standard card grid stagger (3-column grid)
 */
export const cardGridStandard = containerVariants(0.1, fadeInUp)

/**
 * Dense card grid stagger (4+ columns)
 */
export const cardGridDense = containerVariants(0.08, fadeInUp)

/**
 * Sparse card grid stagger (1-2 columns)
 */
export const cardGridSparse = containerVariants(0.15, fadeInUp)

/**
 * Card hover effect
 */
export const cardHover: Variants = {
  initial: { y: 0 },
  hover: {
    y: -8,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.3 },
  },
  tap: { scale: 0.98 },
}

// ============================================================================
// MODAL & DIALOG PRESETS
// ============================================================================

/**
 * Modal backdrop fade
 */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

/**
 * Modal content scale and fade
 */
export const modalContent: Variants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 40 },
  },
  exit: { scale: 0.95, opacity: 0, y: 20 },
}

/**
 * Modal slide from right
 */
export const modalSlideRight: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: { x: 400, opacity: 0 },
}

// ============================================================================
// TAB & ACCORDION PRESETS
// ============================================================================

/**
 * Tab content fade transition
 */
export const tabContent: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

/**
 * Tab content with slide
 */
export const tabContentSlide: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.2 } },
}

/**
 * Accordion item expand
 */
export const accordionExpand: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.3 },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3 },
  },
}

// ============================================================================
// NAVIGATION PRESETS
// ============================================================================

/**
 * Navigation menu slide down
 */
export const navSlideDown: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.3 },
  },
}

/**
 * Navbar item hover
 */
export const navItemHover: Variants = {
  initial: { color: 'rgb(75, 85, 99)' },
  hover: {
    color: 'rgb(59, 130, 246)',
    transition: { duration: 0.2 },
  },
}

/**
 * Mobile menu slide
 */
export const mobileMenuSlide: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '-100%', transition: { duration: 0.2 } },
}

// ============================================================================
// FORM PRESETS
// ============================================================================

/**
 * Form field focus animation
 */
export const formFieldFocus: Variants = {
  initial: { borderColor: 'rgb(229, 231, 235)' },
  focus: {
    borderColor: 'rgb(59, 130, 246)',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    transition: { duration: 0.2 },
  },
}

/**
 * Error message shake
 */
export const errorShake: Variants = {
  shake: {
    x: [-5, 5, -5, 5, 0],
    transition: { duration: 0.4 },
  },
}

/**
 * Success checkmark animation
 */
export const successCheck: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 40 },
  },
}

// ============================================================================
// LIST & TIMELINE PRESETS
// ============================================================================

/**
 * Timeline item with line
 */
export const timelineItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
}

/**
 * List item with stagger
 */
export const listItemStagger = containerVariants(0.1, fadeInUp)

/**
 * Numbered list item
 */
export const numberedListItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (custom) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: custom * 0.05 },
  }),
}

// ============================================================================
// LOADING & SKELETON PRESETS
// ============================================================================

/**
 * Skeleton loader shimmer animation
 */
export const skeletonShimmer: Variants = {
  animate: {
    backgroundPosition: ['200% 0%', '-200% 0%'],
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
}

/**
 * Loading spinner rotation
 */
export const loadingSpinner: Variants = {
  animate: {
    rotate: 360,
    transition: { duration: 1, repeat: Infinity, ease: 'linear' },
  },
}

/**
 * Pulse loader
 */
export const loadingPulse: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.7, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
}

// ============================================================================
// NOTIFICATION PRESETS
// ============================================================================

/**
 * Toast notification slide in from bottom
 */
export const toastSlideIn: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: { y: 100, opacity: 0, transition: { duration: 0.2 } },
}

/**
 * Toast notification slide from top
 */
export const toastSlideInTop: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: { y: -100, opacity: 0, transition: { duration: 0.2 } },
}

/**
 * Alert/Banner slide down
 */
export const alertSlide: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.3 } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
}

// ============================================================================
// IMAGE PRESETS
// ============================================================================

/**
 * Image reveal with fade and scale
 */
export const imageReveal: Variants = {
  hidden: { scale: 1.1, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

/**
 * Image zoom on hover
 */
export const imageZoom: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.1, transition: { duration: 0.3 } },
}

/**
 * Parallax image
 */
export const parallaxImage: Variants = {
  initial: { y: 0 },
  animate: { y: (custom) => custom * 20 },
}

// ============================================================================
// UTILITY PRESETS
// ============================================================================

/**
 * Fade in and out loop
 */
export const fadeLoop: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: { duration: 2, repeat: Infinity },
  },
}

/**
 * Subtle bounce on screen
 */
export const subtleBounce: Variants = {
  animate: {
    y: [0, -5, 0],
    transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
  },
}

/**
 * Entrance with stagger and exit with sequence
 */
export const entranceExitStagger = (childVariant = fadeInUp) => {
  return {
    hidden: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Common timing configurations
 */
export const timingConfigs = {
  instant: { duration: 0.1 },
  fast: { duration: 0.2 },
  normal: { duration: 0.3 },
  slow: { duration: 0.5 },
  verySlow: { duration: 0.8 },
  spring: { type: 'spring' as const, stiffness: 400, damping: 40 },
  gentleSpring: { type: 'spring' as const, stiffness: 100, damping: 20 },
}

/**
 * Common easing curves
 */
export const easingCurves = {
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
}

/**
 * Common viewport margins for scroll triggers
 */
export const viewportMargins = {
  aggressive: '0px 0px -100px 0px', // Trigger 100px before entering
  normal: '0px 0px -50px 0px', // Trigger 50px before entering
  conservative: '0px 0px 0px 0px', // Trigger when fully in view
  lazy: '0px 0px 100px 0px', // Trigger 100px after entering
}

/**
 * Common stagger delays
 */
export const staggerDelays = {
  veryFast: 0.02,
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
  verySlow: 0.2,
}

export default {
  pageEnter,
  pageExit,
  staggerFast,
  staggerMedium,
  staggerSlow,
  staggerVerySlow,
  heroHeadline,
  heroSubheadline,
  heroCTA,
  cardGridStandard,
  cardGridDense,
  cardGridSparse,
  cardHover,
  modalBackdrop,
  modalContent,
  modalSlideRight,
  tabContent,
  tabContentSlide,
  accordionExpand,
  navSlideDown,
  navItemHover,
  mobileMenuSlide,
  formFieldFocus,
  errorShake,
  successCheck,
  timelineItem,
  listItemStagger,
  numberedListItem,
  skeletonShimmer,
  loadingSpinner,
  loadingPulse,
  toastSlideIn,
  toastSlideInTop,
  alertSlide,
  imageReveal,
  imageZoom,
  parallaxImage,
  fadeLoop,
  subtleBounce,
  entranceExitStagger,
  timingConfigs,
  easingCurves,
  viewportMargins,
  staggerDelays,
}
