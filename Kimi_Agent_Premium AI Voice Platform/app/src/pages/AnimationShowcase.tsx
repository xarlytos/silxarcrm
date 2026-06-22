/**
 * Animation Showcase Page
 *
 * Demonstrates all animation features and components
 * Remove or repurpose this page once testing is complete
 */

import { useRef } from 'react'
import { motion } from 'framer-motion'
import ScrollReveal from '../components/ScrollReveal'
import {
  AnimatedSpinner,
  SkeletonLoader,
  StaggeredList,
  StaggeredGrid,
  RevealedSection,
  FloatingElement,
  PulsingElement,
  ProgressIndicator,
  PulseBadge,
  GradientText,
} from '../components/AnimatedElements'
import { useParallaxScroll } from '../hooks/useParallaxScroll'
import { useScrollEffects } from '../hooks/useScrollEffects'
import {
  containerVariants,
  itemSlideUp,
  hoverLift,
  duration,
  spacing,
} from '../lib/animations'

export default function AnimationShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollProgress } = useScrollEffects()
  const { y } = useParallaxScroll(0.3)

  const mockItems = [
    { id: 1, content: <div className="p-4 bg-va-bg-card rounded-lg">Item 1</div> },
    { id: 2, content: <div className="p-4 bg-va-bg-card rounded-lg">Item 2</div> },
    { id: 3, content: <div className="p-4 bg-va-bg-card rounded-lg">Item 3</div> },
    { id: 4, content: <div className="p-4 bg-va-bg-card rounded-lg">Item 4</div> },
    { id: 5, content: <div className="p-4 bg-va-bg-card rounded-lg">Item 5</div> },
    { id: 6, content: <div className="p-4 bg-va-bg-card rounded-lg">Item 6</div> },
  ]

  return (
    <div className="w-full bg-va-bg-primary text-va-text-primary">
      {/* Hero Section with Parallax */}
      <div ref={containerRef} className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-0 bg-gradient-to-b from-va-bg-elevated to-transparent z-0" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <h1 className="text-6xl font-bold mb-6">
            <GradientText animated>Animation Showcase</GradientText>
          </h1>
          <p className="text-xl text-va-text-secondary max-w-2xl mx-auto">
            Explore all the animation utilities, components, and effects built into the enhanced Layout system
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 z-10"
        >
          <div className="text-center text-va-text-secondary">
            <p className="mb-2">Scroll to explore</p>
            <div className="text-2xl">↓</div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Progress */}
      <div className="fixed top-16 left-0 right-0 h-1 bg-va-bg-card z-40">
        <motion.div
          className="h-full bg-gradient-to-r from-accent-blue via-accent-violet to-accent-cyan"
          style={{ scaleX: scrollProgress }}
          initial={{ scaleX: 0 }}
        />
      </div>

      {/* Section 1: Spinners and Loaders */}
      <RevealedSection title="Loaders & Spinners" subtitle="Loading states" className="py-20 px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-va-bg-card rounded-xl p-8 flex flex-col items-center justify-center">
            <AnimatedSpinner />
            <p className="mt-6 text-center text-va-text-secondary">AnimatedSpinner</p>
          </div>

          <div className="bg-va-bg-card rounded-xl p-8">
            <SkeletonLoader count={2} />
            <p className="mt-6 text-center text-va-text-secondary">SkeletonLoader</p>
          </div>

          <div className="bg-va-bg-card rounded-xl p-8 flex flex-col items-center justify-center">
            <ProgressIndicator progress={0.65} />
            <p className="mt-6 text-center text-va-text-secondary">ProgressIndicator</p>
          </div>
        </div>
      </RevealedSection>

      {/* Section 2: Lists */}
      <ScrollReveal variant="slideUp" className="py-20 px-6 md:px-12 bg-va-bg-elevated">
        <h2 className="text-4xl font-bold mb-4">
          <GradientText>Staggered Lists</GradientText>
        </h2>
        <p className="text-lg text-va-text-secondary mb-12">Items animate in sequence</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-6">Vertical List</h3>
            <StaggeredList
              items={[
                { id: 1, content: <div className="p-3 bg-va-bg-card rounded">Feature One</div> },
                { id: 2, content: <div className="p-3 bg-va-bg-card rounded">Feature Two</div> },
                { id: 3, content: <div className="p-3 bg-va-bg-card rounded">Feature Three</div> },
              ]}
              className="space-y-3"
            />
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-6">Badge List</h3>
            <div className="space-y-3">
              <PulseBadge label="New Feature" variant="primary" />
              <PulseBadge label="Success" variant="success" />
              <PulseBadge label="Warning" variant="warning" />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Section 3: Grids */}
      <RevealedSection
        title="Staggered Grids"
        subtitle="Items scale in with stagger"
        className="py-20 px-6 md:px-12"
      >
        <StaggeredGrid items={mockItems} columns={3} />
      </RevealedSection>

      {/* Section 4: Hover Effects */}
      <ScrollReveal variant="slideUp" className="py-20 px-6 md:px-12 bg-va-bg-elevated">
        <h2 className="text-4xl font-bold mb-12">Hover Effects</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            variants={hoverLift}
            initial="initial"
            whileHover="hover"
            className="p-6 bg-va-bg-card rounded-lg cursor-pointer text-center"
          >
            <p>Hover Lift</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-6 bg-va-bg-card rounded-lg cursor-pointer text-center"
          >
            <p>Scale Up</p>
          </motion.div>

          <motion.div
            whileHover={{ rotate: 5 }}
            className="p-6 bg-va-bg-card rounded-lg cursor-pointer text-center"
          >
            <p>Rotate</p>
          </motion.div>

          <motion.div
            whileHover={{ boxShadow: '0 0 20px rgba(79, 110, 247, 0.5)' }}
            className="p-6 bg-va-bg-card rounded-lg cursor-pointer text-center"
          >
            <p>Glow</p>
          </motion.div>
        </div>
      </ScrollReveal>

      {/* Section 5: Scroll Reveals */}
      <RevealedSection
        title="Scroll Reveals"
        subtitle="Animations trigger on scroll"
        className="py-20 px-6 md:px-12"
      >
        <div className="space-y-8">
          <ScrollReveal variant="slideUp">
            <div className="p-8 bg-va-bg-card rounded-xl border border-va-border-subtle">
              <h3 className="text-xl font-semibold mb-2">Slide Up</h3>
              <p className="text-va-text-secondary">This element slides up into view</p>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="slideLeft" delay={0.1}>
            <div className="p-8 bg-va-bg-card rounded-xl border border-va-border-subtle ml-0 md:ml-12">
              <h3 className="text-xl font-semibold mb-2">Slide Left</h3>
              <p className="text-va-text-secondary">This element slides in from the left</p>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="scaleIn" delay={0.2}>
            <div className="p-8 bg-va-bg-card rounded-xl border border-va-border-subtle">
              <h3 className="text-xl font-semibold mb-2">Scale In</h3>
              <p className="text-va-text-secondary">This element scales into view</p>
            </div>
          </ScrollReveal>
        </div>
      </RevealedSection>

      {/* Section 6: Special Effects */}
      <ScrollReveal variant="slideUp" className="py-20 px-6 md:px-12 bg-va-bg-elevated">
        <h2 className="text-4xl font-bold mb-12">Special Effects</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-va-bg-card rounded-xl p-12 flex items-center justify-center">
            <FloatingElement delay={0}>
              <div className="text-6xl">🎈</div>
            </FloatingElement>
          </div>

          <div className="bg-va-bg-card rounded-xl p-12 flex items-center justify-center">
            <PulsingElement intensity={0.7}>
              <div className="text-4xl font-bold text-accent-blue">Pulsing Element</div>
            </PulsingElement>
          </div>
        </div>
      </ScrollReveal>

      {/* Section 7: Spacing Reference */}
      <RevealedSection
        title="Spacing System"
        subtitle="3px base unit rhythm"
        className="py-20 px-6 md:px-12"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-6"
        >
          {Object.entries(spacing).map(([key, value]) => (
            <motion.div key={key} variants={itemSlideUp} className="flex items-center gap-4">
              <div className="w-24 font-mono text-sm text-accent-blue">{key}</div>
              <div className="flex-1 flex items-center">
                <div
                  className="bg-accent-blue rounded"
                  style={{ height: '4px', width: `calc(${value} * 2)` }}
                />
                <span className="ml-4 text-sm text-va-text-secondary">{value}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </RevealedSection>

      {/* Section 8: Call to Action */}
      <div className="py-20 px-6 md:px-12 bg-va-bg-elevated">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-4xl font-bold mb-6">Ready to use animations?</h2>
          <p className="text-lg text-va-text-secondary mb-8">
            Check out the ANIMATION_GUIDE.md for comprehensive documentation on all available utilities, hooks, and
            components.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-gradient-to-r from-accent-blue to-accent-violet rounded-full text-white font-semibold hover:shadow-lg"
          >
            Get Started
          </motion.button>
        </motion.div>
      </div>

      {/* Footer note */}
      <div className="py-12 px-6 md:px-12 bg-va-bg-primary border-t border-va-border-subtle">
        <p className="text-center text-sm text-va-text-secondary">
          Animation Showcase Page • Remove after testing • See ANIMATION_GUIDE.md for full documentation
        </p>
      </div>
    </div>
  )
}
