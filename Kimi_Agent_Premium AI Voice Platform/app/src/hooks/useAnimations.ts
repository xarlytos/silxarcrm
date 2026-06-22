import { useEffect, useRef, useState } from 'react'
import { useAnimation, useInView, useMotionTemplate, useMotionValue, useTransform, Variants } from 'framer-motion'

/**
 * Animation Variants Library
 * Comprehensive collection of reusable animation presets
 */

// ============================================================================
// FADE ANIMATIONS
// ============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

// ============================================================================
// SLIDE ANIMATIONS
// ============================================================================

export const slideUp: Variants = {
  hidden: { y: 100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const slideDown: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const slideLeft: Variants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const slideRight: Variants = {
  hidden: { x: 100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ============================================================================
// SCALE ANIMATIONS
// ============================================================================

export const scaleIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export const scaleInCenter: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
  },
}

export const scaleUp: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

// ============================================================================
// SHIMMER ANIMATIONS
// ============================================================================

export const shimmer: Variants = {
  initial: { backgroundPosition: '200% center' },
  animate: {
    backgroundPosition: '-200% center',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export const shimmerPulse: Variants = {
  initial: { opacity: 0.6, backgroundPosition: '200% center' },
  animate: {
    opacity: [0.6, 1, 0.6],
    backgroundPosition: '-200% center',
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ============================================================================
// GLOW ANIMATIONS
// ============================================================================

export const glow: Variants = {
  hidden: { boxShadow: '0 0 0px rgba(59, 130, 246, 0)' },
  visible: {
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.5)',
      '0 0 40px rgba(59, 130, 246, 0.8)',
      '0 0 20px rgba(59, 130, 246, 0.5)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export const glowText: Variants = {
  hidden: {
    textShadow: '0 0 0px rgba(59, 130, 246, 0)',
    color: 'rgb(59, 130, 246)',
  },
  visible: {
    textShadow: [
      '0 0 10px rgba(59, 130, 246, 0)',
      '0 0 20px rgba(59, 130, 246, 0.8)',
      '0 0 10px rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ============================================================================
// BOUNCE ANIMATIONS
// ============================================================================

export const bounce: Variants = {
  hidden: { y: 0 },
  visible: {
    y: [0, -20, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export const bounceIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: [0, 1.05, 0.95, 1],
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
}

// ============================================================================
// ROTATE ANIMATIONS
// ============================================================================

export const rotate: Variants = {
  hidden: { rotate: 0 },
  visible: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

export const rotateIn: Variants = {
  hidden: { rotate: -180, opacity: 0 },
  visible: {
    rotate: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

// ============================================================================
// FLIP ANIMATIONS
// ============================================================================

export const flip: Variants = {
  hidden: { rotateY: 90, opacity: 0 },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const flipBounce: Variants = {
  hidden: { rotateX: -180, opacity: 0 },
  visible: {
    rotateX: [0, 20, 0],
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

// ============================================================================
// STAGGER UTILITIES
// ============================================================================

export const containerVariants = (
  staggerDelay: number = 0.1,
  childVariants?: Variants
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.1,
      ...childVariants?.visible?.transition,
    },
  },
})

export const itemVariants = (animation: Variants = fadeInUp): Variants => ({
  hidden: animation.hidden,
  visible: {
    ...animation.visible,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
})

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for scroll-triggered animations
 * Triggers animation when element enters viewport
 */
export function useScrollTrigger(threshold: number = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '0px 0px -100px 0px', amount: threshold })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  return { ref, controls, isInView }
}

/**
 * Hook for mouse-follow animations
 * Creates parallax or tracking effects based on mouse movement
 */
export function useMouseFollow(strength: number = 1) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const handleMouseMove = (event: MouseEvent) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distX = (event.clientX - centerX) * strength * 0.1
    const distY = (event.clientY - centerY) * strength * 0.1

    x.set(distX)
    y.set(distY)
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [strength])

  return { ref, x, y }
}

/**
 * Hook for parallax scroll effects
 * Creates depth effect based on scroll position
 */
export function useParallax(offset: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const y = useMotionValue(0)

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const elementTop = rect.top
        const windowHeight = window.innerHeight
        const distanceFromCenter = elementTop - windowHeight / 2
        setScrollY(distanceFromCenter * offset)
        y.set(distanceFromCenter * offset)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [offset, y])

  return { ref, y, scrollY }
}

/**
 * Hook for text reveal animations
 * Character-by-character reveal effect
 */
export function useTextReveal(text: string, duration: number = 1) {
  const controls = useAnimation()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: (i * duration) / text.length,
        duration: 0.3,
      },
    }),
  }

  return { ref, controls, itemVariants }
}

/**
 * Hook for staggered animations on list items
 * Automatically applies stagger effect to child elements
 */
export function useStaggerAnimation(delay: number = 0.1, duration: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null)
  const controls = useAnimation()
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  const containerVar: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
        delayChildren: 0.1,
      },
    },
  }

  const itemVar: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration },
    },
  }

  return { ref, controls, containerVar, itemVar }
}

/**
 * Hook for hover animations
 * Combines hover and tap animations
 */
export function useHoverAnimation(scale: number = 1.05, rotation: number = 0) {
  return {
    whileHover: {
      scale,
      rotate: rotation,
      transition: { duration: 0.3 },
    },
    whileTap: {
      scale: scale * 0.95,
      transition: { duration: 0.1 },
    },
  }
}

/**
 * Hook for animated counters
 * Animates number counting from 0 to target
 */
export function useAnimatedCounter(to: number, duration: number = 2, decimals: number = 0) {
  const [count, setCount] = useState(0)
  const motionValue = useMotionValue(0)
  const displayValue = useTransform(motionValue, (latest) =>
    decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString()
  )

  useEffect(() => {
    const animation = setInterval(() => {
      setCount((prev) => {
        if (prev >= to) {
          clearInterval(animation)
          return to
        }
        const increment = to / (duration * 60)
        return prev + increment
      })
      motionValue.set(count)
    }, 1000 / 60)

    return () => clearInterval(animation)
  }, [to, duration, count, motionValue])

  return { displayValue, count }
}

/**
 * Hook for creating animated gradients
 * Smooth color transitions and animations
 */
export function useAnimatedGradient(colors: string[], duration: number = 6) {
  const gradientAngle = useMotionValue(0)
  const backgroundGradient = useMotionTemplate`linear-gradient(${gradientAngle}deg, ${colors.join(', ')})`

  useEffect(() => {
    const animation = setInterval(() => {
      gradientAngle.set((prev) => (prev + 360 / (duration * 60)) % 360)
    }, 1000 / 60)

    return () => clearInterval(animation)
  }, [duration, gradientAngle])

  return { backgroundGradient, gradientAngle }
}

/**
 * Hook for magnetic button effect
 * Element follows mouse within a certain radius
 */
export function useMagneticButton(strength: number = 0.3) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const distX = (event.clientX - centerX) * strength
    const distY = (event.clientY - centerY) * strength

    x.set(distX)
    y.set(distY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return {
    ref,
    x,
    y,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  }
}

/**
 * Hook for creating pulse animations
 * Smooth pulsing effect (scale + opacity)
 */
export function usePulseAnimation(minScale: number = 0.95, maxScale: number = 1.05, duration: number = 2) {
  const pulseVariants: Variants = {
    animate: {
      scale: [1, maxScale, 1],
      opacity: [1, 0.7, 1],
      transition: {
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  return pulseVariants
}

/**
 * Hook for morphing shapes
 * Smooth transitions between SVG paths
 */
export function useMorphShape(paths: string[], duration: number = 2) {
  const [pathIndex, setPathIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPathIndex((prev) => (prev + 1) % paths.length)
    }, duration * 1000)

    return () => clearInterval(interval)
  }, [duration, paths.length])

  return { currentPath: paths[pathIndex], pathIndex }
}

/**
 * Type definitions for animation variants
 */
export type AnimationVariant =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleInCenter'
  | 'scaleUp'
  | 'shimmer'
  | 'shimmerPulse'
  | 'glow'
  | 'glowText'
  | 'bounce'
  | 'bounceIn'
  | 'rotate'
  | 'rotateIn'
  | 'flip'
  | 'flipBounce'

/**
 * Helper function to get variant by name
 */
export function getVariant(name: AnimationVariant): Variants {
  const variants: Record<AnimationVariant, Variants> = {
    fadeIn,
    fadeInUp,
    fadeInDown,
    fadeInLeft,
    fadeInRight,
    slideUp,
    slideDown,
    slideLeft,
    slideRight,
    scaleIn,
    scaleInCenter,
    scaleUp,
    shimmer,
    shimmerPulse,
    glow,
    glowText,
    bounce,
    bounceIn,
    rotate,
    rotateIn,
    flip,
    flipBounce,
  }
  return variants[name]
}
