import { useState, useEffect } from 'react'
import { useMotionValue, useTransform } from 'framer-motion'

/**
 * useScrollEffects Hook
 *
 * Provides scroll-based animation utilities:
 * - scrollProgress: 0-1 normalized scroll position
 * - scrollY: absolute scroll Y position
 * - scrollDirection: 'up' or 'down'
 * - isAtTop: boolean indicating if at top of page
 * - isAtBottom: boolean indicating if at bottom of page
 */
export function useScrollEffects() {
  const [scrollY, setScrollY] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down')
  const [isAtTop, setIsAtTop] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  const scrollYMotion = useMotionValue(0)

  // Transform scroll Y to 0-1 progress
  const scrollProgress = useTransform(
    scrollYMotion,
    [0, 100],
    [0, 1],
    { clamp: true }
  )

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      setScrollY(currentScrollY)
      scrollYMotion.set(currentScrollY)

      // Determine scroll direction
      if (currentScrollY > lastScrollY) {
        setScrollDirection('down')
      } else if (currentScrollY < lastScrollY) {
        setScrollDirection('up')
      }
      setLastScrollY(currentScrollY)

      // Check position
      setIsAtTop(currentScrollY < 10)
      setIsAtBottom(
        currentScrollY + windowHeight >= documentHeight - 10
      )
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, scrollYMotion])

  return {
    scrollY,
    scrollProgress,
    scrollDirection,
    isAtTop,
    isAtBottom,
  }
}

/**
 * useParallax Hook
 *
 * Creates parallax scroll effect for elements
 * @param offset - Parallax offset strength (0.1 to 1)
 */
export function useParallax(offset = 0.5) {
  const scrollYMotion = useMotionValue(0)

  const y = useTransform(
    scrollYMotion,
    [0, 1000],
    [0, 1000 * offset]
  )

  useEffect(() => {
    const handleScroll = () => {
      scrollYMotion.set(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollYMotion])

  return { y }
}

/**
 * useRevealOnScroll Hook
 *
 * Reveals element when it enters viewport
 * @param threshold - Visibility threshold (0-1, default 0.2)
 */
export function useRevealOnScroll(threshold = 0.2) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasBeenVisible(true)
        } else {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    // Get all elements with data-reveal attribute
    const elements = document.querySelectorAll('[data-reveal]')
    elements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [threshold])

  return { isVisible, hasBeenVisible }
}

/**
 * useScrollLock Hook
 *
 * Locks/unlocks body scroll
 */
export function useScrollLock() {
  const lock = () => {
    document.body.style.overflow = 'hidden'
  }

  const unlock = () => {
    document.body.style.overflow = 'auto'
  }

  return { lock, unlock }
}
