import React from 'react'
import { motion } from 'framer-motion'
import {
  fadeIn,
  fadeInUp,
  slideUp,
  scaleIn,
  shimmer,
  glow,
  bounce,
  rotate,
  flip,
  containerVariants,
  itemVariants,
  useScrollTrigger,
  useMouseFollow,
  useParallax,
  useHoverAnimation,
  useAnimatedCounter,
  useAnimatedGradient,
  useMagneticButton,
  usePulseAnimation,
  useStaggerAnimation,
} from '../hooks/useAnimations'

export function AnimationsDemo() {
  // ========== Scroll Trigger Demo ==========
  const { ref: scrollRef, controls: scrollControls } = useScrollTrigger(0.3)

  // ========== Mouse Follow Demo ==========
  const { ref: mouseRef, x: mouseX, y: mouseY } = useMouseFollow(1)

  // ========== Parallax Demo ==========
  const { ref: parallaxRef, y: parallaxY } = useParallax(0.5)

  // ========== Counter Demo ==========
  const { count: counterValue } = useAnimatedCounter(100, 2, 0)

  // ========== Gradient Demo ==========
  const { backgroundGradient } = useAnimatedGradient(['#3b82f6', '#8b5cf6', '#ec4899'], 4)

  // ========== Magnetic Button Demo ==========
  const magneticButton = useMagneticButton(0.3)

  // ========== Pulse Animation Demo ==========
  const pulseVar = usePulseAnimation(0.95, 1.05, 2)

  // ========== Stagger Demo ==========
  const { ref: staggerRef, controls: staggerControls, containerVar, itemVar } = useStaggerAnimation(0.1, 0.5)

  // ========== Hover Animation Demo ==========
  const hoverAnimation = useHoverAnimation(1.05, 5)

  return (
    <div className="space-y-20 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Custom Animations Library</h1>
          <p className="text-xl text-gray-600">10+ Reusable Animation Presets</p>
        </motion.div>

        {/* ========== FADE ANIMATIONS ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Fade Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { name: 'fadeIn', variant: fadeIn },
              { name: 'fadeInUp', variant: fadeInUp },
              { name: 'fadeInLeft', variant: { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } } },
              { name: 'fadeInRight', variant: { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0 } } },
              { name: 'fadeInDown', variant: { hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } } },
            ].map((item) => (
              <motion.div
                key={item.name}
                initial="hidden"
                animate="visible"
                variants={item.variant}
                className="h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
              >
                {item.name}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ========== SCALE ANIMATIONS ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Scale Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'scaleIn', variant: scaleIn },
              { name: 'scaleInCenter', variant: { hidden: { scale: 0.8, opacity: 0 }, visible: { scale: 1, opacity: 1 } } },
              { name: 'scaleUp', variant: { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1 } } },
            ].map((item) => (
              <motion.div
                key={item.name}
                initial="hidden"
                animate="visible"
                variants={item.variant}
                className="h-40 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
              >
                {item.name}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ========== SHIMMER & GLOW ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Shimmer & Glow Effects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial="initial"
              animate="animate"
              variants={shimmer}
              className="h-40 bg-gradient-to-r from-gray-300 via-white to-gray-300 bg-200% rounded-lg flex items-center justify-center font-semibold shadow-lg"
            >
              Shimmer Effect
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={glow}
              className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold"
            >
              Glow Effect
            </motion.div>
          </div>
        </section>

        {/* ========== BOUNCE & ROTATE ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Bounce & Rotate</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={bounce}
              className="h-40 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
            >
              Bounce
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={rotate}
              className="h-40 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
            >
              Rotate
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={flip}
              className="h-40 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
            >
              Flip
            </motion.div>
          </div>
        </section>

        {/* ========== SCROLL TRIGGER ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Scroll Trigger Animation</h2>
          <motion.div
            ref={scrollRef}
            initial="hidden"
            animate={scrollControls}
            variants={slideUp}
            className="h-40 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
          >
            Scroll into view to trigger
          </motion.div>
        </section>

        {/* ========== MOUSE FOLLOW ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Mouse Follow Effect</h2>
          <motion.div
            ref={mouseRef}
            style={{
              x: mouseX,
              y: mouseY,
            }}
            className="h-40 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg mx-auto w-full max-w-xs"
          >
            Move your mouse
          </motion.div>
        </section>

        {/* ========== PARALLAX SCROLL ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Parallax Scroll Effect</h2>
          <motion.div
            ref={parallaxRef}
            style={{
              y: parallaxY,
            }}
            className="h-40 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
          >
            Parallax on scroll
          </motion.div>
        </section>

        {/* ========== STAGGER ANIMATION ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Stagger Animation</h2>
          <motion.div
            ref={staggerRef}
            initial="hidden"
            animate={staggerControls}
            variants={containerVar}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                variants={itemVar}
                className="h-32 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
              >
                Item {i + 1}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ========== HOVER & MAGNETIC BUTTON ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Interactive Animations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Hover Animation */}
            <motion.button
              {...hoverAnimation}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg shadow-lg"
            >
              Hover Animation
            </motion.button>

            {/* Magnetic Button */}
            <motion.button
              ref={magneticButton.ref}
              style={{
                x: magneticButton.x,
                y: magneticButton.y,
              }}
              onMouseMove={magneticButton.onMouseMove}
              onMouseLeave={magneticButton.onMouseLeave}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-lg shadow-lg"
            >
              Magnetic Button
            </motion.button>
          </div>
        </section>

        {/* ========== ANIMATED COUNTER ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Animated Counter</h2>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="h-40 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-6xl font-bold text-white shadow-lg"
          >
            {Math.round(counterValue)}
          </motion.div>
        </section>

        {/* ========== ANIMATED GRADIENT ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Animated Gradient</h2>
          <motion.div
            style={{
              background: backgroundGradient,
            }}
            className="h-40 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
          >
            Gradient Animation
          </motion.div>
        </section>

        {/* ========== PULSE ANIMATION ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Pulse Animation</h2>
          <motion.div
            animate="animate"
            variants={pulseVar}
            className="h-40 bg-gradient-to-br from-lime-500 to-lime-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg mx-auto w-full max-w-xs"
          >
            Pulse Effect
          </motion.div>
        </section>

        {/* ========== CONTAINER WITH STAGGER ========== */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-8">Container with Staggered Items</h2>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants(0.1, fadeInUp)}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                variants={itemVariants(fadeInUp)}
                className="h-32 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
              >
                Card {i + 1}
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  )
}
