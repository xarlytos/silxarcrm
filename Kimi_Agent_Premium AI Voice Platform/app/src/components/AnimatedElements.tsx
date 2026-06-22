import React from 'react'
import { motion } from 'framer-motion'
import {
  containerVariants,
  itemSlideUp,
  itemScale,
  loadingSpinner,
  loadingPulse,
  scrollReveal,
  duration,
  easing,
} from '../lib/animations'

/**
 * Collection of pre-made animated components
 * Ready to drop into any page
 */

// ============================================
// LOADING STATES
// ============================================

export function AnimatedSpinner() {
  return (
    <motion.div variants={loadingSpinner} animate="animate" className="flex justify-center">
      <div className="w-8 h-8 border-2 border-accent-blue rounded-full border-t-transparent" />
    </motion.div>
  )
}

export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={loadingPulse}
          animate="animate"
          className="h-12 bg-va-bg-card rounded-lg"
        />
      ))}
    </motion.div>
  )
}

// ============================================
// STAGGERED LISTS
// ============================================

interface StaggeredListProps {
  items: Array<{ id: string | number; content: React.ReactNode }>
  className?: string
  itemClassName?: string
}

export function StaggeredList({ items, className = '', itemClassName = '' }: StaggeredListProps) {
  return (
    <motion.ul
      className={`space-y-4 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.li key={item.id} variants={itemSlideUp} className={itemClassName}>
          {item.content}
        </motion.li>
      ))}
    </motion.ul>
  )
}

// ============================================
// GRID ANIMATIONS
// ============================================

interface StaggeredGridProps {
  items: Array<{ id: string | number; content: React.ReactNode }>
  columns?: number
  className?: string
  itemClassName?: string
}

export function StaggeredGrid({
  items,
  columns = 3,
  className = '',
  itemClassName = '',
}: StaggeredGridProps) {
  return (
    <motion.div
      className={`grid grid-cols-${columns} gap-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={itemScale} className={itemClassName}>
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  )
}

// ============================================
// SCROLL REVEALS
// ============================================

interface RevealedSectionProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function RevealedSection({ title, subtitle, children, className = '' }: RevealedSectionProps) {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className={className}
    >
      {title && (
        <motion.h2 variants={itemSlideUp} className="text-3xl font-bold mb-4">
          {title}
        </motion.h2>
      )}
      {subtitle && (
        <motion.p variants={itemSlideUp} className="text-lg text-text-secondary mb-8">
          {subtitle}
        </motion.p>
      )}
      <motion.div variants={itemSlideUp}>{children}</motion.div>
    </motion.section>
  )
}

// ============================================
// FLOATING ELEMENTS
// ============================================

interface FloatingElementProps {
  children: React.ReactNode
  delay?: number
  duration?: number
}

export function FloatingElement({ children, delay = 0, duration: dur = 6 }: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [-10, 10, -10],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// PULSING ELEMENTS
// ============================================

interface PulsingElementProps {
  children: React.ReactNode
  intensity?: number
}

export function PulsingElement({ children, intensity = 1 }: PulsingElementProps) {
  return (
    <motion.div
      animate={{
        opacity: [1, 0.6 + intensity * 0.4, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================
// PROGRESS INDICATOR
// ============================================

interface ProgressIndicatorProps {
  progress: number // 0-1
  duration?: number
}

export function ProgressIndicator({ progress, duration: dur = 0.5 }: ProgressIndicatorProps) {
  return (
    <div className="h-1 bg-va-bg-card rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-accent-blue via-accent-violet to-accent-cyan"
        animate={{ scaleX: progress }}
        transition={{ duration: dur }}
        style={{ originX: 0 }}
      />
    </div>
  )
}

// ============================================
// BADGE WITH PULSE
// ============================================

interface PulseBadgeProps {
  label: string
  variant?: 'primary' | 'success' | 'warning' | 'error'
}

export function PulseBadge({ label, variant = 'primary' }: PulseBadgeProps) {
  const variantClasses = {
    primary: 'bg-accent-blue text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
    error: 'bg-error text-white',
  }

  return (
    <motion.div
      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${variantClasses[variant]}`}
      animate={{
        boxShadow: [
          '0 0 0 0px rgba(79, 110, 247, 0.4)',
          '0 0 0 8px rgba(79, 110, 247, 0)',
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
      }}
    >
      {label}
    </motion.div>
  )
}

// ============================================
// COUNTDOWN TIMER
// ============================================

interface CountdownProps {
  from: number
  onComplete?: () => void
}

export function Countdown({ from, onComplete }: CountdownProps) {
  const [count, setCount] = React.useState(from)

  React.useEffect(() => {
    if (count <= 0) {
      onComplete?.()
      return
    }

    const timer = setTimeout(() => setCount(count - 1), 1000)
    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <motion.div
      key={count}
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      className="text-4xl font-bold text-accent-blue"
    >
      {count}
    </motion.div>
  )
}

// ============================================
// GRADIENT TEXT
// ============================================

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  animated?: boolean
}

export function GradientText({ children, className = '', animated = false }: GradientTextProps) {
  const variants = {
    animate: {
      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    },
  }

  return (
    <motion.span
      className={`bg-gradient-to-r from-accent-blue via-accent-violet to-accent-cyan bg-clip-text text-transparent bg-200% ${className}`}
      variants={animated ? variants : {}}
      animate={animated ? 'animate' : ''}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  )
}

// ============================================
// PAGE LOADER
// ============================================

export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-va-bg-primary flex items-center justify-center z-[999]"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 100,
        }}
        className="flex flex-col items-center gap-4"
      >
        <AnimatedSpinner />
        <motion.p
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-text-secondary"
        >
          Loading...
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default {
  AnimatedSpinner,
  SkeletonLoader,
  StaggeredList,
  StaggeredGrid,
  RevealedSection,
  FloatingElement,
  PulsingElement,
  ProgressIndicator,
  PulseBadge,
  Countdown,
  GradientText,
  PageLoader,
}
