/**
 * Advanced Micro-Interactions
 *
 * Complex animation patterns for:
 * - Parallax scrolling
 * - Gesture-based animations
 * - Scroll-triggered animations
 * - Complex state transitions
 * - Custom easing functions
 */

import { Variants, TargetAndTransition } from 'framer-motion'

/**
 * PARALLAX SCROLLING
 * Scroll offset-based animations
 */
export const parallaxVariants = (offset = 50): Variants => ({
  initial: {
    y: 0,
  },
  animate: {
    y: offset,
  },
})

/**
 * SCROLL REVEAL
 * Element appears on scroll into view
 */
export const scrollRevealVariants: Variants = {
  initial: {
    opacity: 0,
    y: 50,
  },
  inView: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

/**
 * COUNTER ANIMATION
 * Number counting up animation
 */
export const counterVariants: Variants = {
  animate: {
    opacity: 1,
  },
  initial: {
    opacity: 0,
  },
}

/**
 * DRAG AND DROP FEEDBACK
 * Animations for draggable elements
 */
export const dragVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  drag: {
    scale: 1.05,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    zIndex: 100,
  },
  dragEnd: {
    scale: 1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
}

/**
 * SWIPE GESTURE FEEDBACK
 * Visual feedback for swipe gestures
 */
export const swipeVariants: Variants = {
  initial: {
    opacity: 0,
    x: 0,
  },
  swipeLeft: {
    x: -100,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  swipeRight: {
    x: 100,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
}

/**
 * GESTURE SCALE UP
 * Pinch to zoom feedback
 */
export const gestureScaleVariants: Variants = {
  initial: {
    scale: 1,
    borderRadius: '8px',
  },
  pinch: {
    scale: 1.2,
    borderRadius: '16px',
  },
}

/**
 * ANIMATED BACKGROUND SHIFT
 * Aurora-like background animation
 */
export const auroraBackgroundVariants: Variants = {
  animate: {
    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * FLOATING ANIMATION
 * Subtle up and down motion
 */
export const floatingVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * FLOATING WITH ROTATION
 * Spinning while floating
 */
export const floatingRotateVariants: Variants = {
  animate: {
    y: [0, -30, 0],
    rotate: [0, 360, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * BLUR IN
 * Blur-to-focus entrance
 */
export const blurInVariants: Variants = {
  initial: {
    opacity: 0,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
}

/**
 * BLUR OUT
 * Focus-to-blur exit
 */
export const blurOutVariants: Variants = {
  initial: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(10px)',
    transition: {
      duration: 0.4,
    },
  },
}

/**
 * ROTATE IN
 * Spin entrance animation
 */
export const rotateInVariants: Variants = {
  initial: {
    opacity: 0,
    rotate: -180,
    scale: 0,
  },
  animate: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
      duration: 0.6,
    },
  },
}

/**
 * SLIDE IN FROM SIDES
 * Slide entrance from various directions
 */
export const slideInFromLeft: Variants = {
  initial: {
    opacity: 0,
    x: -100,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

export const slideInFromRight: Variants = {
  initial: {
    opacity: 0,
    x: 100,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

export const slideInFromTop: Variants = {
  initial: {
    opacity: 0,
    y: -100,
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

export const slideInFromBottom: Variants = {
  initial: {
    opacity: 0,
    y: 100,
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

/**
 * FLIP ANIMATION
 * 3D flip card effect
 */
export const flipVariants: Variants = {
  initial: {
    rotateY: 0,
  },
  flip: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
}

/**
 * EXPAND/COLLAPSE
 * Height based animation
 */
export const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'visible',
    transition: {
      height: {
        duration: 0.3,
        ease: 'easeInOut',
      },
      opacity: {
        duration: 0.3,
      },
    },
  },
}

/**
 * PROGRESS BAR FILL
 * Animated progress indicator
 */
export const progressFillVariants: Variants = {
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
}

/**
 * SKELETON PULSE
 * Alternate between light and dark
 */
export const skeletonPulseVariants: Variants = {
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * TYPING ANIMATION
 * Character-by-character reveal
 */
export const typingContainerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

export const typingCharVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.1,
    },
  },
}

/**
 * BOUNCE ANIMATION
 * Elastic bounce effect
 */
export const bounceVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * JELLY SHAKE
 * Organic shake effect
 */
export const jellyShakeVariants: Variants = {
  animate: {
    skewX: [-2, 2, -2, 2, 0],
    skewY: [1, -1, 1, -1, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
}

/**
 * ZOOM IN/OUT
 * Zoom entrance and exit
 */
export const zoomInVariants: Variants = {
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
      damping: 20,
    },
  },
}

export const zoomOutVariants: Variants = {
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
}

/**
 * CUSTOM EASING FUNCTIONS
 * Pre-defined easing curves
 */
export const easings = {
  // Standard
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],

  // Material Design
  standard: [0.4, 0, 0.2, 1],
  deceleration: [0, 0, 0.2, 1],
  acceleration: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],

  // Custom curves
  elasticOut: [0.34, 1.56, 0.64, 1],
  elasticInOut: [0.68, -0.55, 0.265, 1.55],
  backOut: [0.175, 0.885, 0.32, 1.275],
  backInOut: [0.68, -0.55, 0.265, 1.55],

  // Smooth
  smooth: [0.25, 0.46, 0.45, 0.94],
  smoothEaseIn: [0.25, 0.1, 0.25, 1],
  smoothEaseOut: [0.25, 0.46, 0.45, 0.94],
}

/**
 * MORPH ANIMATION
 * SVG path morphing (use with SVG path data)
 */
export const morphVariants: Variants = {
  initial: {
    opacity: 0,
    pathLength: 0,
  },
  animate: {
    opacity: 1,
    pathLength: 1,
    transition: {
      duration: 1,
      ease: 'easeInOut',
    },
  },
}

/**
 * GRADIENT SHIFT
 * Animated gradient background
 */
export const gradientShiftVariants: Variants = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * GLITCH EFFECT
 * Digital glitch animation
 */
export const glitchVariants: Variants = {
  animate: {
    x: [0, -2, 2, -2, 0],
    opacity: [1, 0.8, 1, 0.8, 1],
    filter: [
      'hue-rotate(0deg)',
      'hue-rotate(-10deg)',
      'hue-rotate(10deg)',
      'hue-rotate(-10deg)',
      'hue-rotate(0deg)',
    ],
    transition: {
      duration: 0.3,
      ease: 'easeInOut',
    },
  },
}

/**
 * COMBINED ANIMATION SEQUENCES
 * Ready-to-use complex animations
 */
export const complexSequences = {
  /**
   * Hero entrance - scale + fade + slide
   */
  heroEntrance: {
    initial: { opacity: 0, scale: 0.8, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
      duration: 0.5,
    },
  },

  /**
   * Card flip on hover
   */
  cardFlip: {
    initial: { rotateY: 0 },
    whileHover: {
      rotateY: 180,
      transition: { duration: 0.6 },
    },
  },

  /**
   * Menu item enter with slide + fade
   */
  menuItemEnter: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3 },
  },

  /**
   * Loading state with spinner + text
   */
  loadingSequence: {
    spinnerVariant: {
      animate: { rotate: 360 },
    },
    textVariant: {
      animate: { opacity: [0.6, 1, 0.6] },
    },
  },

  /**
   * Notification pop-in
   */
  notificationPop: {
    initial: { scale: 0, opacity: 0, rotate: -45 },
    animate: { scale: 1, opacity: 1, rotate: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
}
