import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import Footer from './Footer'
import { useScrollEffects } from '../hooks/useScrollEffects'

/**
 * Enhanced Layout with:
 * - Global animation utilities (framer-motion)
 * - Consistent spacing/rhythm (3px base unit, 8-24px common gaps)
 * - Page transition animations (fade + scale)
 * - Scroll-based effects system (parallax, fade-in, reveal)
 */
export default function Layout() {
  const location = useLocation()
  const [isLoaded, setIsLoaded] = useState(false)
  const { scrollProgress } = useScrollEffects()

  // Trigger initial load animation
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  // Page transition variants
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 12,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: {
      opacity: 0,
      y: -12,
      transition: {
        duration: 0.3,
        ease: [0.7, 0, 0.84, 0],
      },
    },
  }

  // Layout container animation
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const childVariants = {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  }

  return (
    <motion.div
      className="min-h-[100dvh] flex flex-col bg-va-bg-primary"
      variants={containerVariants}
      initial="initial"
      animate={isLoaded ? 'animate' : 'initial'}
    >
      {/* Animated Navbar */}
      <motion.nav variants={childVariants} className="relative z-50">
        <Navbar />
      </motion.nav>

      {/* Main content with page transitions */}
      <motion.main
        className="flex-1 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* Animated Footer */}
      <motion.footer variants={childVariants} className="relative z-40">
        <Footer />
      </motion.footer>

      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-blue via-accent-violet to-accent-cyan origin-left"
        style={{ scaleX: scrollProgress }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: scrollProgress }}
      />
    </motion.div>
  )
}
