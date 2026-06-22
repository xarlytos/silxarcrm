# Animation & Layout Guide

Enhanced Layout.tsx with global animation utilities, consistent spacing, page transitions, and scroll-based effects.

## Quick Start

### 1. Global Spacing Rhythm (3px base unit)

```typescript
import { spacing } from '@/lib/animations'

// Use spacing constants for consistent layout
<div className={`p-${spacing.lg}`}> {/* 16px padding */}
  <h1 className={`mb-${spacing.xl}`}>Title</h1> {/* 24px margin-bottom */}
</div>

// Or with tailwind directly
<div className="p-4 mb-6"> {/* 16px, 24px */}
```

**Spacing Scale:**
- `xs`: 3px (1 unit)
- `sm`: 6px (2 units)
- `md`: 12px (4 units)
- `lg`: 16px (5.33 units) - standard padding
- `xl`: 24px (8 units)
- `2xl`: 32px (10.66 units)
- `3xl`: 48px (16 units)

### 2. Page Transitions

Layout.tsx automatically handles page transitions with `AnimatePresence`.

```typescript
// Just use Outlet - transitions happen automatically!
// Uses pageVariants defined in Layout.tsx
<Outlet />
```

Custom page transition example:
```typescript
import { motion } from 'framer-motion'
import { pageTransition } from '@/lib/animations'

export function MyPage() {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      Content
    </motion.div>
  )
}
```

### 3. Scroll-Based Effects

#### Scroll Progress Bar

Already included in Layout.tsx footer. Access via:

```typescript
import { useScrollEffects } from '@/hooks/useScrollEffects'

export function MyComponent() {
  const { scrollProgress, scrollDirection, isAtTop, isAtBottom } = useScrollEffects()

  return (
    <motion.div
      style={{ opacity: scrollProgress }}
    >
      Fades in as you scroll
    </motion.div>
  )
}
```

#### Parallax Scroll Effect

```typescript
import { useParallaxScroll } from '@/hooks/useParallaxScroll'
import { motion } from 'framer-motion'

export function HeroSection() {
  const { y } = useParallaxScroll(0.5) // 50% offset

  return (
    <motion.div style={{ y }}>
      <img src="background.jpg" alt="Hero" />
    </motion.div>
  )
}
```

#### Reveal on Scroll

```typescript
import ScrollReveal from '@/components/ScrollReveal'

export function Features() {
  return (
    <div className="space-y-8">
      <ScrollReveal variant="slideUp">
        <div className="feature-card">Feature 1</div>
      </ScrollReveal>
      <ScrollReveal variant="slideUp" delay={0.1}>
        <div className="feature-card">Feature 2</div>
      </ScrollReveal>
    </div>
  )
}
```

**ScrollReveal Variants:**
- `slideUp` (default)
- `slideDown`
- `slideLeft`
- `slideRight`
- `fadeIn`
- `scaleIn`

### 4. Container Animations (Stagger Children)

```typescript
import { motion } from 'framer-motion'
import { containerVariants, itemSlideUp } from '@/lib/animations'

export function CardGrid() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-6"
    >
      {items.map((item) => (
        <motion.div key={item.id} variants={itemSlideUp}>
          <Card {...item} />
        </motion.div>
      ))}
    </motion.div>
  )
}
```

### 5. Hover Animations

```typescript
import { motion } from 'framer-motion'
import { hoverLift, hoverScale } from '@/lib/animations'

export function InteractiveCard() {
  return (
    <motion.div
      variants={hoverLift}
      initial="initial"
      whileHover="hover"
      className="card"
    >
      <div className="content">Hover me</div>
    </motion.div>
  )
}
```

**Hover Variants:**
- `hoverLift`: Raises element on hover
- `hoverScale`: Scales element up
- `hoverScaleSmall`: Larger scale effect
- `hoverBrighten`: Increases opacity

### 6. Modal/Dialog Animations

```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { modalBackdropVariants, modalContentVariants } from '@/lib/animations'

export function Modal({ isOpen, onClose }) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
          />
          <motion.div
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="modal-content"
          >
            Your content
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

### 7. Loading States

```typescript
import { motion } from 'framer-motion'
import { loadingSpinner, loadingPulse } from '@/lib/animations'

export function LoadingSpinner() {
  return (
    <motion.div variants={loadingSpinner} animate="animate">
      <div className="w-8 h-8 border-2 border-accent-blue rounded-full border-t-transparent" />
    </motion.div>
  )
}

export function LoadingPulse() {
  return (
    <motion.div variants={loadingPulse} animate="animate" className="skeleton" />
  )
}
```

### 8. Duration Constants

```typescript
import { duration } from '@/lib/animations'

// Use throughout your components
const myAnimation = {
  transition: { duration: duration.base / 1000 } // 300ms
}

// Available: fastest (150ms), fast (200ms), base (300ms), slow (500ms), slowest (700ms)
```

### 9. Easing Functions

```typescript
import { easing } from '@/lib/animations'

// Use with framer-motion
<motion.div
  animate={{ x: 100 }}
  transition={{ ease: easing.easeOut }}
/>

// Available: easeOut, easeIn, easeInOut, sharp, snappy, bounce, elastic, smooth
```

### 10. Advanced Patterns

#### Staggered List with Custom Delay

```typescript
import { createStaggerAnimation, withDelay, itemSlideUp } from '@/lib/animations'

export function List({ items }) {
  const stagger = createStaggerAnimation(0.08, 0.4)

  return (
    <motion.ul variants={stagger} initial="hidden" animate="visible">
      {items.map((item, i) => (
        <motion.li
          key={item.id}
          variants={itemSlideUp}
          transition={withDelay(i * 50)}
        >
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

#### Smooth Scroll to Element

```typescript
import { useSmoothScroll } from '@/hooks/useParallaxScroll'

export function Navigation() {
  const { scrollToElement } = useSmoothScroll()

  return (
    <button onClick={() => scrollToElement('features-section', 80)}>
      Go to Features
    </button>
  )
}
```

#### Mouse Parallax Effect

```typescript
import { useMouseParallax } from '@/hooks/useParallaxScroll'
import { motion } from 'framer-motion'

export function InteractiveHero() {
  const containerRef = useRef(null)
  const { x, y } = useMouseParallax(containerRef, 15)

  return (
    <div ref={containerRef} className="relative h-screen">
      <motion.img
        src="layer1.png"
        style={{ x, y }}
        className="absolute"
      />
      <motion.img
        src="layer2.png"
        style={{
          x: useTransform(x, (val) => val * 0.5),
          y: useTransform(y, (val) => val * 0.5),
        }}
        className="absolute"
      />
    </div>
  )
}
```

## Timing Guidelines

- **Fastest (150ms)**: Button clicks, quick feedback
- **Fast (200ms)**: Hover states, micro-interactions
- **Base (300ms)**: Standard animations, page elements
- **Slow (500ms)**: Important reveals, entrance animations
- **Slowest (700ms)**: Large scale transitions, hero animations

## Best Practices

1. **Keep animations under 500ms** for interaction feedback
2. **Use easeOut for entrances**, easeIn for exits
3. **Stagger children by 50-100ms** for cascading effects
4. **Always cleanup** scroll listeners in useEffect
5. **Use `once: true`** in ScrollReveal for performance
6. **Prefer `AnimatePresence mode="wait"`** for page transitions
7. **Use consistent spacing** from the spacing constants

## Component Tree with Layout

```
Layout (with page transitions)
├── Navbar (animated in)
├── main
│   └── Outlet (page transitions via AnimatePresence)
│       └── Page Component
│           ├── ScrollReveal Section 1
│           ├── ScrollReveal Section 2
│           └── Parallax Hero
└── Footer (animated in)
```

## Customization

To adjust animation timings globally, modify:
- `duration` in `/src/lib/animations.ts`
- `easing` in `/src/lib/animations.ts`
- Page transition config in `/src/components/Layout.tsx`

## Performance Notes

- Scroll listeners are passive and optimized
- IntersectionObserver used for scroll reveals
- Animations use GPU-accelerated properties (transform, opacity)
- `once: true` in ScrollReveal prevents re-animation
- Motion values are memoized for stability
