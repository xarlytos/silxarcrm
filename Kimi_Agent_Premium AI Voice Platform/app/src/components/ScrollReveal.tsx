import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { scrollReveal } from '../lib/animations'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  threshold?: number
  delay?: number
  once?: boolean
  variant?: 'slideUp' | 'fadeIn' | 'scaleIn' | 'slideDown' | 'slideLeft' | 'slideRight'
}

/**
 * ScrollReveal Component
 *
 * Animates child elements when they scroll into view
 * Supports multiple animation variants
 */
export const ScrollReveal = React.forwardRef<HTMLDivElement, ScrollRevealProps>(
  ({
    children,
    className = '',
    threshold = 0.2,
    delay = 0,
    once = true,
    variant = 'slideUp',
  }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState(false)
    const divRef = ref || internalRef

    const variantMap = {
      slideUp: {
        hidden: { opacity: 0, y: 32 },
        visible: { opacity: 1, y: 0 },
      },
      fadeIn: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      },
      scaleIn: {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
      },
      slideDown: {
        hidden: { opacity: 0, y: -32 },
        visible: { opacity: 1, y: 0 },
      },
      slideLeft: {
        hidden: { opacity: 0, x: -32 },
        visible: { opacity: 1, x: 0 },
      },
      slideRight: {
        hidden: { opacity: 0, x: 32 },
        visible: { opacity: 1, x: 0 },
      },
    }

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (once && divRef && typeof divRef === 'object' && 'current' in divRef) {
              observer.unobserve(divRef.current!)
            }
          } else if (!once) {
            setIsVisible(false)
          }
        },
        { threshold }
      )

      if (divRef && typeof divRef === 'object' && 'current' in divRef && divRef.current) {
        observer.observe(divRef.current)
      }

      return () => observer.disconnect()
    }, [threshold, once, divRef])

    return (
      <motion.div
        ref={divRef}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={variantMap[variant]}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
          delay,
        }}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)

ScrollReveal.displayName = 'ScrollReveal'

export default ScrollReveal
