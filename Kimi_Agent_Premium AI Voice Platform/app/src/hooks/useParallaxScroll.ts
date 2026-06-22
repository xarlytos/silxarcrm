import { useEffect, useRef } from 'react'
import { useMotionValue, useTransform } from 'framer-motion'

/**
 * useParallaxScroll Hook
 *
 * Creates smooth parallax scroll effect for elements
 * Perfect for hero sections, background images, and layered elements
 *
 * @param offset - Parallax multiplier (0.1-1, higher = more movement)
 * @param direction - 'vertical' | 'horizontal'
 * @returns { y, x } motion values for use with framer-motion
 */
export function useParallaxScroll(
  offset = 0.5,
  direction: 'vertical' | 'horizontal' = 'vertical'
) {
  const scrollY = useMotionValue(0)
  const scrollX = useMotionValue(0)

  // Transform scroll values to parallax movement
  const y = useTransform(scrollY, (value) => value * offset)
  const x = useTransform(scrollX, (value) => value * offset)

  useEffect(() => {
    const handleScroll = () => {
      if (direction === 'vertical') {
        scrollY.set(window.scrollY)
      } else {
        scrollX.set(window.scrollX)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [direction, scrollY, scrollX])

  return direction === 'vertical' ? { y } : { x }
}

/**
 * useElementParallax Hook
 *
 * Creates parallax effect relative to element's position in viewport
 * More subtle than full-page parallax
 *
 * @param offset - Parallax strength (0.1-1)
 * @returns ref to attach to element, transform object
 */
export function useElementParallax(offset = 0.3) {
  const elementRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current) return

      const elementRect = elementRef.current.getBoundingClientRect()
      const elementTop = elementRect.top
      const windowHeight = window.innerHeight

      // Calculate parallax based on element position
      const elementProgress = 1 - elementTop / windowHeight
      const parallaxY = (elementProgress - 0.5) * 100 * offset

      y.set(parallaxY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [offset, y])

  return { ref: elementRef, y }
}

/**
 * useSmoothScroll Hook
 *
 * Smooth scroll animation between elements
 * Integrates with Lenis smooth scroll library if available
 */
export function useSmoothScroll() {
  const scrollToElement = (elementId: string, offset = 0) => {
    const element = document.getElementById(elementId)
    if (!element) return

    const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    })
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return { scrollToElement, scrollToTop }
}

/**
 * useInViewport Hook
 *
 * Detects if element is in viewport with customizable threshold
 *
 * @param threshold - Visibility threshold (0-1)
 * @returns { isInView, ref }
 */
export function useInViewport(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useMotionValue(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInView.set(entry.isIntersecting ? 1 : 0)
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, isInView])

  return { ref, isInView }
}

/**
 * useScrollDirection Hook
 *
 * Detects scroll direction and provides utilities
 *
 * @returns { direction, isScrollingUp, isScrollingDown }
 */
export function useScrollDirection() {
  const lastScrollY = useRef(0)
  const direction = useMotionValue<'up' | 'down'>('down')

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY.current) {
        direction.set('down')
      } else {
        direction.set('up')
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [direction])

  return {
    direction,
    isScrollingUp: useTransform(
      direction,
      (dir) => dir === 'up'
    ),
    isScrollingDown: useTransform(
      direction,
      (dir) => dir === 'down'
    ),
  }
}

/**
 * useMouseParallax Hook
 *
 * Creates parallax effect based on mouse position
 * Perfect for interactive hero sections
 *
 * @param containerRef - Ref to container element
 * @param strength - Parallax strength (1-30)
 * @returns { x, y } motion values
 */
export function useMouseParallax(
  containerRef: React.RefObject<HTMLDivElement>,
  strength = 10
) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const angleX = (e.clientY - centerY) / strength
      const angleY = (e.clientX - centerX) / strength

      y.set(angleX)
      x.set(-angleY)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [strength, x, y, containerRef])

  return { x, y }
}
