/**
 * Advanced Animation Examples
 * Real-world patterns and best practices
 */

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Zap, Palette, Smartphone } from 'lucide-react'
import {
  containerVariants,
  itemVariants,
  fadeInUp,
  slideUp,
  scaleInCenter,
  useScrollTrigger,
  useParallax,
  useAnimatedCounter,
  useStaggerAnimation,
  useMagneticButton,
  useMouseFollow,
  glow,
  glowText,
  useAnimatedGradient,
} from '../hooks/useAnimations'

// ============================================================================
// EXAMPLE 1: Hero Section with Parallax
// ============================================================================

export function HeroSectionExample() {
  const { ref: bgRef, y: bgY } = useParallax(0.5)
  const { ref: contentRef, y: contentY } = useParallax(0.2)

  return (
    <section className="relative h-screen overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Background Parallax Layer */}
      <motion.div
        ref={bgRef}
        style={{ y: bgY }}
        className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20"
      />

      {/* Content */}
      <motion.div
        ref={contentRef}
        style={{ y: contentY }}
        initial="hidden"
        animate="visible"
        variants={slideUp}
        className="relative h-full flex flex-col items-center justify-center text-center text-white px-4"
      >
        <h1 className="text-6xl md:text-7xl font-bold mb-6">Hero Title</h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl text-gray-300">
          Compelling subtitle with parallax scrolling effect
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold"
        >
          Get Started
        </motion.button>
      </motion.div>
    </section>
  )
}

// ============================================================================
// EXAMPLE 2: Staggered Feature Grid with Scroll Trigger
// ============================================================================

interface FeatureItem {
  icon: React.ReactNode
  title: string
  description: string
}

interface FeatureGridProps {
  features?: FeatureItem[]
}

export function FeatureGridExample({ features = defaultFeatures }: FeatureGridProps) {
  const { ref, controls } = useScrollTrigger(0.2)

  const containerVar = useMemo(() => containerVariants(0.1, fadeInUp), [])

  return (
    <section className="py-20 px-4 max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-16">Features</h2>

      <motion.div
        ref={ref}
        initial="hidden"
        animate={controls}
        variants={containerVar}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {features.map((feature, i) => (
          <FeatureCard key={i} feature={feature} />
        ))}
      </motion.div>
    </section>
  )
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  return (
    <motion.div
      variants={itemVariants(fadeInUp)}
      whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      className="p-6 bg-white rounded-lg shadow-lg transition-shadow duration-300"
    >
      <div className="text-4xl mb-4">{feature.icon}</div>
      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
      <p className="text-gray-600">{feature.description}</p>
    </motion.div>
  )
}

const defaultFeatures: FeatureItem[] = [
  {
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    title: 'Lightning Fast',
    description: 'Optimized performance with smooth 60fps animations',
  },
  {
    icon: <Palette className="w-6 h-6 text-purple-500" />,
    title: 'Beautiful Designs',
    description: 'Stunning visual effects and transitions',
  },
  {
    icon: <Smartphone className="w-6 h-6 text-blue-500" />,
    title: 'Responsive',
    description: 'Works perfectly on all devices and screen sizes',
  },
]

// ============================================================================
// EXAMPLE 3: Statistics Section with Animated Counters
// ============================================================================

interface StatItem {
  label: string
  value: number
  suffix?: string
}

interface StatsProps {
  stats?: StatItem[]
}

export function StatisticsExample({ stats = defaultStats }: StatsProps) {
  const { ref, controls } = useScrollTrigger(0.3)

  return (
    <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
      <motion.div
        ref={ref}
        initial="hidden"
        animate={controls}
        variants={containerVariants(0.1)}
        className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            variants={itemVariants(fadeInUp)}
            className="text-center text-white"
          >
            <StatCounter value={stat.value} suffix={stat.suffix} />
            <p className="text-lg mt-2 text-gray-100">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function StatCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const { count } = useAnimatedCounter(value, 2.5)

  return (
    <div className="text-5xl font-bold">
      {Math.round(count)}
      {suffix}
    </div>
  )
}

const defaultStats: StatItem[] = [
  { label: 'Active Users', value: 10000 },
  { label: 'Projects', value: 250 },
  { label: 'Happy Clients', value: 50 },
  { label: 'Uptime', value: 99, suffix: '%' },
]

// ============================================================================
// EXAMPLE 4: Interactive Button Group with Magnetic Effect
// ============================================================================

interface ButtonItem {
  label: string
  onClick?: () => void
}

interface ButtonGroupProps {
  buttons?: ButtonItem[]
}

export function MagneticButtonGroupExample({ buttons = defaultButtons }: ButtonGroupProps) {
  return (
    <section className="py-20 px-4 flex flex-col items-center gap-8">
      <h2 className="text-4xl font-bold">Interactive Buttons</h2>

      <div className="flex flex-wrap gap-6 justify-center">
        {buttons.map((button, i) => (
          <MagneticButtonItem key={i} button={button} />
        ))}
      </div>
    </section>
  )
}

function MagneticButtonItem({ button }: { button: ButtonItem }) {
  const { ref, x, y, onMouseMove, onMouseLeave } = useMagneticButton(0.3)

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={button.onClick}
      className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg"
    >
      {button.label}
    </motion.button>
  )
}

const defaultButtons: ButtonItem[] = [
  { label: 'Button 1' },
  { label: 'Button 2' },
  { label: 'Button 3' },
]

// ============================================================================
// EXAMPLE 5: Testimonial Carousel with Animations
// ============================================================================

interface Testimonial {
  author: string
  text: string
  avatar: string
}

interface TestimonialCarouselProps {
  testimonials?: Testimonial[]
}

export function TestimonialCarouselExample({
  testimonials = defaultTestimonials,
}: TestimonialCarouselProps) {
  const [current, setCurrent] = React.useState(0)

  return (
    <section className="py-20 px-4 max-w-4xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-16">What Our Users Say</h2>

      <div className="relative">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-lg shadow-lg"
        >
          <p className="text-xl text-gray-700 mb-6">"{testimonials[current].text}"</p>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              {testimonials[current].avatar}
            </div>
            <div>
              <p className="font-bold">{testimonials[current].author}</p>
              <p className="text-sm text-gray-500">Happy Customer</p>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex gap-4 justify-center mt-8">
          {testimonials.map((_, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-colors ${
                i === current ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

const defaultTestimonials: Testimonial[] = [
  {
    author: 'John Doe',
    avatar: 'JD',
    text: 'Amazing animations library! Made our website look incredibly professional.',
  },
  {
    author: 'Jane Smith',
    avatar: 'JS',
    text: 'The hooks are so intuitive and easy to use. Saved us so much development time!',
  },
  {
    author: 'Mike Johnson',
    avatar: 'MJ',
    text: 'Perfect balance between customization and ease of use. Highly recommended!',
  },
]

// ============================================================================
// EXAMPLE 6: Animated Gradient Background
// ============================================================================

export function AnimatedGradientBackgroundExample() {
  const { backgroundGradient } = useAnimatedGradient(['#3b82f6', '#8b5cf6', '#ec4899', '#3b82f6'], 8)

  return (
    <motion.section
      style={{ background: backgroundGradient }}
      className="py-20 px-4 text-white relative overflow-hidden"
    >
      {/* Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={scaleInCenter}
        className="max-w-2xl mx-auto text-center"
      >
        <h2 className="text-4xl font-bold mb-4">Animated Gradient Background</h2>
        <p className="text-lg text-gray-100">
          Smooth color transitions create a dynamic, eye-catching background
        </p>
      </motion.div>
    </motion.section>
  )
}

// ============================================================================
// EXAMPLE 7: Scroll-Triggered Reveal Animation
// ============================================================================

export function ScrollRevealExample() {
  const { ref: section1, controls: controls1 } = useScrollTrigger(0.3)
  const { ref: section2, controls: controls2 } = useScrollTrigger(0.3)
  const { ref: section3, controls: controls3 } = useScrollTrigger(0.3)

  return (
    <section className="space-y-32 py-20 px-4 max-w-4xl mx-auto">
      <motion.div
        ref={section1}
        initial="hidden"
        animate={controls1}
        variants={slideUp}
        className="h-64 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
      >
        Section 1 - Appears on Scroll
      </motion.div>

      <motion.div
        ref={section2}
        initial="hidden"
        animate={controls2}
        variants={slideUp}
        className="h-64 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
      >
        Section 2 - Appears on Scroll
      </motion.div>

      <motion.div
        ref={section3}
        initial="hidden"
        animate={controls3}
        variants={slideUp}
        className="h-64 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
      >
        Section 3 - Appears on Scroll
      </motion.div>
    </section>
  )
}

// ============================================================================
// EXAMPLE 8: Product Card with Hover Effects
// ============================================================================

interface ProductCard {
  id: string
  name: string
  price: number
  image: string
  badge?: string
}

interface ProductGridProps {
  products?: ProductCard[]
}

export function ProductGridExample({ products = defaultProducts }: ProductGridProps) {
  const { ref, controls } = useScrollTrigger(0.2)

  return (
    <section className="py-20 px-4 max-w-6xl mx-auto">
      <h2 className="text-4xl font-bold text-center mb-16">Featured Products</h2>

      <motion.div
        ref={ref}
        initial="hidden"
        animate={controls}
        variants={containerVariants(0.08, fadeInUp)}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            variants={itemVariants(fadeInUp)}
            whileHover={{ y: -10 }}
            className="relative bg-white rounded-lg overflow-hidden shadow-lg group"
          >
            {/* Image Container */}
            <div className="relative h-48 bg-gradient-to-br from-gray-300 to-gray-400 overflow-hidden">
              {product.badge && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold"
                >
                  {product.badge}
                </motion.div>
              )}
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500"
              />
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{product.name}</h3>
              <p className="text-gray-600 mb-4">High-quality product description</p>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">${product.price}</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Add to Cart
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

const defaultProducts: ProductCard[] = [
  { id: '1', name: 'Product 1', price: 99.99, image: 'img1.jpg', badge: 'New' },
  { id: '2', name: 'Product 2', price: 149.99, image: 'img2.jpg', badge: 'Popular' },
  { id: '3', name: 'Product 3', price: 199.99, image: 'img3.jpg' },
]

// ============================================================================
// EXAMPLE 9: Text with Glow Effect
// ============================================================================

export function GlowTextExample() {
  return (
    <section className="py-20 px-4 flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={glowText}
          className="text-6xl font-bold text-blue-500 mb-8"
        >
          Glowing Text
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-xl text-gray-300 max-w-2xl"
        >
          Advanced animations with multiple visual effects combining for stunning results
        </motion.p>
      </div>
    </section>
  )
}

// ============================================================================
// EXAMPLE 10: Mouse Tracking Card
// ============================================================================

export function MouseTrackingCardExample() {
  const { ref, x, y } = useMouseFollow(0.5)

  return (
    <section className="py-20 px-4 flex items-center justify-center min-h-screen">
      <motion.div
        ref={ref}
        style={{ x, y }}
        className="w-full max-w-sm h-80 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-2xl flex items-center justify-center text-white font-bold text-2xl"
      >
        Move your mouse over the card
      </motion.div>
    </section>
  )
}
