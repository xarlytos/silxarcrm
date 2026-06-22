/**
 * Micro-Interaction Examples
 *
 * Copy-paste ready component examples using the microInteractions.ts patterns
 * These are reference implementations for common UI patterns
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import * as micro from '@/utils/microInteractions'
import { Button } from './button'
import { cn } from '@/lib/utils'

/**
 * EXAMPLE 1: Button with Ripple Effect
 *
 * Material Design-style ripple on click
 */
export function RippleButton({
  children,
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y }])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 600)

    props.onClick?.(e)
  }

  return (
    <Button
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
      {...props}
    >
      {children}

      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full bg-white/50 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            marginLeft: -10,
            marginTop: -10,
          }}
          variants={micro.rippleVariants}
          initial="initial"
          animate="animate"
        />
      ))}
    </Button>
  )
}

/**
 * EXAMPLE 2: Form Input with Focus Animation
 *
 * Animated label that floats up on focus
 */
export function AnimatedInput({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!props.value)

  const isActive = isFocused || hasValue

  return (
    <div className="relative">
      <motion.input
        type="text"
        className={cn(
          'w-full px-4 py-2.5 rounded-md border border-input bg-background',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring/50',
          error && 'border-destructive focus:ring-destructive/20'
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => setHasValue(!!e.target.value)}
        variants={micro.inputFocusVariants}
        animate={isFocused ? 'focus' : 'initial'}
        {...props}
      />

      {label && (
        <motion.label
          className={cn(
            'absolute left-4 top-2.5 text-sm pointer-events-none',
            isActive ? 'text-primary' : 'text-muted-foreground'
          )}
          variants={micro.inputLabelVariants}
          animate={isActive ? 'focused' : 'initial'}
        >
          {label}
        </motion.label>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-1 text-sm text-destructive flex items-center gap-1"
            variants={micro.inputErrorVariants}
            initial="initial"
            animate="animate"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * EXAMPLE 3: Loading Skeleton
 *
 * Shimmer effect on skeleton loader
 */
export function SkeletonLoader() {
  return (
    <motion.div
      className={cn(
        'h-12 rounded-md bg-gradient-to-r',
        'from-muted via-muted to-muted',
        'bg-[length:1000px_100%]'
      )}
      variants={micro.skeletonShimmerVariants}
      initial="initial"
      animate="animate"
      style={{
        backgroundImage: `linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted)) 40%, hsl(var(--foreground)/.1) 50%, hsl(var(--muted)) 60%, hsl(var(--muted)) 100%)`,
      }}
    />
  )
}

/**
 * EXAMPLE 4: Loading Spinner
 *
 * Rotating loader icon
 */
export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <motion.div
      variants={micro.spinnerVariants}
      initial="initial"
      animate="animate"
    >
      <Loader2 size={size} className="text-primary" />
    </motion.div>
  )
}

/**
 * EXAMPLE 5: Success State
 *
 * Animated checkmark with scale and opacity
 */
export function SuccessState({
  message,
  onDismiss,
}: {
  message: string
  onDismiss?: () => void
}) {
  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-md bg-success/10 border border-success/30"
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        variants={micro.successCheckmarkVariants}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-success">
          <Check className="h-4 w-4 text-white" />
        </div>
      </motion.div>
      <span className="text-sm font-medium text-success">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto text-success/70 hover:text-success"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

/**
 * EXAMPLE 6: Error State with Shake
 *
 * Error message with shake animation
 */
export function ErrorState({
  message,
  onDismiss,
}: {
  message: string
  onDismiss?: () => void
}) {
  return (
    <motion.div
      className="flex items-center gap-3 p-4 rounded-md bg-destructive/10 border border-destructive/30"
      variants={micro.errorShakeVariants}
      animate="animate"
    >
      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-destructive/20">
        <AlertCircle className="h-4 w-4 text-destructive" />
      </div>
      <span className="text-sm font-medium text-destructive">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto text-destructive/70 hover:text-destructive"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

/**
 * EXAMPLE 7: Card with Hover Effect
 *
 * Elevation on hover with glow
 */
export function HoverCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="p-6 rounded-lg border border-border bg-card"
      variants={micro.cardHoverVariants}
      initial="initial"
      whileHover="hover"
    >
      {children}
    </motion.div>
  )
}

/**
 * EXAMPLE 8: Modal with Backdrop
 *
 * Animated backdrop and content entrance
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            variants={micro.modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg shadow-lg"
            style={{ x: '-50%', y: '-50%' }}
            variants={micro.modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * EXAMPLE 9: Dropdown Menu
 *
 * Staggered menu items with entrance animation
 */
export function DropdownMenu({
  isOpen,
  items,
}: {
  isOpen: boolean
  items: Array<{ label: string; onClick: () => void }>
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50"
          variants={micro.dropdownVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className="py-1"
            variants={micro.menuItemContainerVariants}
            initial="initial"
            animate="animate"
          >
            {items.map((item) => (
              <motion.button
                key={item.label}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent/50"
                variants={micro.menuItemVariants}
                whileHover="hover"
                onClick={item.onClick}
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * EXAMPLE 10: Staggered List
 *
 * Items animate in with stagger effect
 */
export function StaggeredList({
  items,
}: {
  items: Array<{ id: string; label: string }>
}) {
  return (
    <motion.div
      variants={micro.staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="p-4 border-b border-border last:border-b-0"
          variants={micro.staggerItemVariants}
        >
          {item.label}
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * EXAMPLE 11: Toast Notification
 *
 * Slides in from right with spring animation
 */
export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: {
  message: string
  type?: 'info' | 'success' | 'error'
  duration?: number
  onDismiss?: () => void
}) {
  const bgColor = {
    info: 'bg-blue-500/10 border-blue-500/30',
    success: 'bg-success/10 border-success/30',
    error: 'bg-destructive/10 border-destructive/30',
  }[type]

  const textColor = {
    info: 'text-blue-600',
    success: 'text-success',
    error: 'text-destructive',
  }[type]

  return (
    <motion.div
      className={cn('p-4 rounded-md border', bgColor)}
      variants={micro.toastEnterVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onAnimationComplete={() => {
        if (duration) {
          setTimeout(onDismiss, duration)
        }
      }}
    >
      <p className={cn('text-sm font-medium', textColor)}>{message}</p>
    </motion.div>
  )
}

/**
 * EXAMPLE 12: Badge with Pulse
 *
 * Badge that pulses for attention
 */
export function PulseBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30"
      variants={micro.badgePulseVariants}
      animate="animate"
    >
      <span className="text-xs font-semibold text-primary">{children}</span>
    </motion.div>
  )
}
