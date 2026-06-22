/**
 * Animations Library Index & Quick Reference
 * Re-export all animations and hooks for easy importing
 */

// Animation Variants
export {
  // Fade animations
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  // Slide animations
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  // Scale animations
  scaleIn,
  scaleInCenter,
  scaleUp,
  // Shimmer & glow
  shimmer,
  shimmerPulse,
  glow,
  glowText,
  // Bounce animations
  bounce,
  bounceIn,
  // Rotate animations
  rotate,
  rotateIn,
  // Flip animations
  flip,
  flipBounce,
  // Stagger utilities
  containerVariants,
  itemVariants,
  // Custom hooks
  useScrollTrigger,
  useMouseFollow,
  useParallax,
  useTextReveal,
  useStaggerAnimation,
  useHoverAnimation,
  useAnimatedCounter,
  useAnimatedGradient,
  useMagneticButton,
  usePulseAnimation,
  useMorphShape,
  // Types and helpers
  type AnimationVariant,
  getVariant,
} from './useAnimations'

/**
 * Quick Reference Guide
 *
 * BASIC USAGE:
 *
 * import { fadeInUp } from '@/hooks/useAnimations'
 *
 * <motion.div variants={fadeInUp}>Content</motion.div>
 *
 *
 * SCROLL TRIGGER:
 *
 * const { ref, controls } = useScrollTrigger()
 * <motion.div ref={ref} animate={controls} variants={fadeInUp}>
 *
 *
 * STAGGER:
 *
 * <motion.div variants={containerVariants(0.1)}>
 *   <motion.div variants={itemVariants(fadeInUp)}>Item 1</motion.div>
 *   <motion.div variants={itemVariants(fadeInUp)}>Item 2</motion.div>
 * </motion.div>
 *
 *
 * MOUSE FOLLOW:
 *
 * const { ref, x, y } = useMouseFollow(1)
 * <motion.div ref={ref} style={{x, y}}>Content</motion.div>
 *
 *
 * PARALLAX:
 *
 * const { ref, y } = useParallax(0.5)
 * <motion.div ref={ref} style={{y}}>Content</motion.div>
 */

/**
 * Animation Presets by Use Case
 *
 * Landing Page Hero:
 * - slideUp, scaleInCenter, glowText
 *
 * Card Grids:
 * - containerVariants() + itemVariants(fadeInUp)
 *
 * Loading States:
 * - shimmer, shimmerPulse, bounce, rotate
 *
 * Interactive Elements:
 * - useHoverAnimation(), useMagneticButton()
 *
 * Statistics/Counters:
 * - useAnimatedCounter(), usePulseAnimation()
 *
 * Scroll Effects:
 * - useScrollTrigger(), useParallax()
 *
 * Text Effects:
 * - glowText, useTextReveal()
 *
 * Background Effects:
 * - useAnimatedGradient(), shimmerPulse, glow
 */

/**
 * Performance Checklist
 *
 * ✓ Use will-change: true for animated elements
 * ✓ Use once: true in scroll triggers to prevent re-animation
 * ✓ Memoize variants in complex components
 * ✓ Reduce staggerDelay for large lists (0.05-0.08)
 * ✓ Use GPU acceleration for transforms (x, y, scale, rotate)
 * ✓ Avoid animating opacity on large content areas
 * ✓ Lazy load animations for off-screen elements
 */
