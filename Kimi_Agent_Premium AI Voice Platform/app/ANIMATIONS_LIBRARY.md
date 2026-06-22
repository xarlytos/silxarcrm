# Custom Animations Library - Complete Reference

A comprehensive, production-ready animations library with 10+ reusable animation presets, hooks, and utilities built on Framer Motion.

## Quick Start

```tsx
import {
  fadeInUp,
  slideUp,
  useScrollTrigger,
  containerVariants,
  itemVariants,
} from '@/hooks/useAnimations'
import { motion } from 'framer-motion'

function MyComponent() {
  const { ref, controls } = useScrollTrigger()

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={fadeInUp}
    >
      Content here
    </motion.div>
  )
}
```

---

## 📦 Animation Variants (10+ Presets)

All variants follow Framer Motion's `Variants` type and include smooth easing functions.

### Fade Animations

**`fadeIn`** - Simple opacity fade
```tsx
<motion.div variants={fadeIn}>Content</motion.div>
```

**`fadeInUp`** - Fade in with upward movement
```tsx
<motion.div variants={fadeInUp}>Content</motion.div>
```

**`fadeInDown`** - Fade in with downward movement
```tsx
<motion.div variants={fadeInDown}>Content</motion.div>
```

**`fadeInLeft`** - Fade in from left
```tsx
<motion.div variants={fadeInLeft}>Content</motion.div>
```

**`fadeInRight`** - Fade in from right
```tsx
<motion.div variants={fadeInRight}>Content</motion.div>
```

---

### Slide Animations

**`slideUp`** - Slide up with 100px offset
```tsx
<motion.div variants={slideUp}>Content</motion.div>
```

**`slideDown`** - Slide down with 100px offset
```tsx
<motion.div variants={slideDown}>Content</motion.div>
```

**`slideLeft`** - Slide left with 100px offset
```tsx
<motion.div variants={slideLeft}>Content</motion.div>
```

**`slideRight`** - Slide right with 100px offset
```tsx
<motion.div variants={slideRight}>Content</motion.div>
```

---

### Scale Animations

**`scaleIn`** - Scale from 0 to 1
```tsx
<motion.div variants={scaleIn}>Content</motion.div>
```

**`scaleInCenter`** - Scale from 0.8 with bounce easing
```tsx
<motion.div variants={scaleInCenter}>Content</motion.div>
```

**`scaleUp`** - Subtle scale from 0.95 to 1
```tsx
<motion.div variants={scaleUp}>Content</motion.div>
```

---

### Shimmer & Glow Effects

**`shimmer`** - Infinite shimmer animation (requires gradient background)
```tsx
<motion.div
  variants={shimmer}
  initial="initial"
  animate="animate"
  className="bg-gradient-to-r from-gray-300 via-white to-gray-300 bg-200%"
>
  Content
</motion.div>
```

**`shimmerPulse`** - Shimmer with opacity pulse
```tsx
<motion.div
  variants={shimmerPulse}
  initial="initial"
  animate="animate"
>
  Content
</motion.div>
```

**`glow`** - Infinite glowing box shadow effect
```tsx
<motion.div variants={glow} animate="visible">
  Content
</motion.div>
```

**`glowText`** - Text glow effect with text-shadow
```tsx
<motion.div variants={glowText} animate="visible" className="text-blue-500">
  Glowing Text
</motion.div>
```

---

### Bounce Animations

**`bounce`** - Continuous bouncing effect
```tsx
<motion.div variants={bounce} animate="visible">
  Content
</motion.div>
```

**`bounceIn`** - Bounce on entrance with scale animation
```tsx
<motion.div variants={bounceIn}>
  Content
</motion.div>
```

---

### Rotate Animations

**`rotate`** - Continuous 360° rotation
```tsx
<motion.div variants={rotate} animate="visible">
  <Icon />
</motion.div>
```

**`rotateIn`** - Rotate from -180° to 0° on entrance
```tsx
<motion.div variants={rotateIn}>
  Content
</motion.div>
```

---

### Flip Animations

**`flip`** - 3D flip on Y-axis (requires perspective)
```tsx
<motion.div variants={flip} style={{ perspective: 1000 }}>
  Content
</motion.div>
```

**`flipBounce`** - 3D flip on X-axis with bounce
```tsx
<motion.div variants={flipBounce} style={{ perspective: 1000 }}>
  Content
</motion.div>
```

---

## 🎯 Stagger Utilities

### Container Variants

Create staggered animations for multiple children:

```tsx
<motion.div
  initial="hidden"
  animate="visible"
  variants={containerVariants(0.1, fadeInUp)}
>
  {items.map((item, i) => (
    <motion.div key={i} variants={itemVariants(fadeInUp)}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

**Parameters:**
- `staggerDelay` (default: 0.1) - Delay between children animations
- `childVariants` (optional) - Animation variant for children

### Item Variants

Wrap any animation variant for use with stagger:

```tsx
variants={itemVariants(fadeInUp)}
```

---

## 🪝 Custom Hooks

### `useScrollTrigger(threshold?: number)`

Triggers animation when element enters viewport.

```tsx
const { ref, controls, isInView } = useScrollTrigger(0.3)

return (
  <motion.div
    ref={ref}
    initial="hidden"
    animate={controls}
    variants={fadeInUp}
  >
    Content appears when scrolled into view
  </motion.div>
)
```

**Parameters:**
- `threshold` (default: 0.1) - Percentage of element visible before triggering

**Returns:**
- `ref` - Attach to element
- `controls` - Pass to `animate` prop
- `isInView` - Boolean state

---

### `useMouseFollow(strength?: number)`

Creates parallax or tracking effect based on mouse movement.

```tsx
const { ref, x, y } = useMouseFollow(1)

return (
  <motion.div
    ref={ref}
    style={{ x, y }}
    className="w-20 h-20"
  >
    Follows mouse
  </motion.div>
)
```

**Parameters:**
- `strength` (default: 1) - How much element follows (0-1 recommended)

**Returns:**
- `ref` - Attach to element
- `x` - Motion value for horizontal movement
- `y` - Motion value for vertical movement

---

### `useParallax(offset?: number)`

Creates depth effect based on scroll position.

```tsx
const { ref, y } = useParallax(0.5)

return (
  <motion.div
    ref={ref}
    style={{ y }}
    className="bg-image"
  >
    Parallax content
  </motion.div>
)
```

**Parameters:**
- `offset` (default: 0.5) - Parallax strength

**Returns:**
- `ref` - Attach to element
- `y` - Motion value for vertical offset
- `scrollY` - Current scroll distance

---

### `useStaggerAnimation(delay?: number, duration?: number)`

Applies stagger effect to list items automatically.

```tsx
const { ref, controls, containerVar, itemVar } = useStaggerAnimation(0.1, 0.5)

return (
  <motion.div
    ref={ref}
    initial="hidden"
    animate={controls}
    variants={containerVar}
  >
    {items.map((item, i) => (
      <motion.div key={i} variants={itemVar}>
        {item}
      </motion.div>
    ))}
  </motion.div>
)
```

**Parameters:**
- `delay` (default: 0.1) - Delay between items
- `duration` (default: 0.5) - Animation duration per item

**Returns:**
- `ref` - Attach to container
- `controls` - Pass to `animate` prop
- `containerVar` - Container variants
- `itemVar` - Item variants

---

### `useHoverAnimation(scale?: number, rotation?: number)`

Combines hover and tap animations.

```tsx
const hoverAnimation = useHoverAnimation(1.05, 5)

return (
  <motion.button
    {...hoverAnimation}
    className="px-4 py-2 bg-blue-500"
  >
    Hover me
  </motion.button>
)
```

**Parameters:**
- `scale` (default: 1.05) - Scale on hover
- `rotation` (default: 0) - Rotation on hover in degrees

**Returns:**
- `whileHover` - Hover state props
- `whileTap` - Tap state props

---

### `useAnimatedCounter(to: number, duration?: number, decimals?: number)`

Animates number counting from 0 to target.

```tsx
const { displayValue, count } = useAnimatedCounter(100, 2, 0)

return <div className="text-4xl">{Math.round(count)}</div>
```

**Parameters:**
- `to` (required) - Target number
- `duration` (default: 2) - Animation duration in seconds
- `decimals` (default: 0) - Number of decimal places

**Returns:**
- `displayValue` - Framer Motion value (for styling)
- `count` - Current count value

---

### `useAnimatedGradient(colors: string[], duration?: number)`

Creates smooth animated gradient transitions.

```tsx
const { backgroundGradient } = useAnimatedGradient(
  ['#3b82f6', '#8b5cf6', '#ec4899'],
  4
)

return (
  <motion.div
    style={{ background: backgroundGradient }}
    className="w-full h-40"
  >
    Animated gradient
  </motion.div>
)
```

**Parameters:**
- `colors` (required) - Array of color hex codes
- `duration` (default: 6) - Animation duration in seconds

**Returns:**
- `backgroundGradient` - Motion template string for style
- `gradientAngle` - Motion value for angle

---

### `useMagneticButton(strength?: number)`

Creates magnetic button effect - element follows mouse within radius.

```tsx
const { ref, x, y, onMouseMove, onMouseLeave } = useMagneticButton(0.3)

return (
  <motion.button
    ref={ref}
    style={{ x, y }}
    onMouseMove={onMouseMove}
    onMouseLeave={onMouseLeave}
    className="px-6 py-3"
  >
    Magnetic
  </motion.button>
)
```

**Parameters:**
- `strength` (default: 0.3) - Magnetic attraction strength

**Returns:**
- `ref` - Attach to button
- `x` - Horizontal motion value
- `y` - Vertical motion value
- `onMouseMove` - Mouse move handler
- `onMouseLeave` - Mouse leave handler

---

### `usePulseAnimation(minScale?: number, maxScale?: number, duration?: number)`

Creates smooth pulsing effect (scale + opacity).

```tsx
const pulseVar = usePulseAnimation(0.95, 1.05, 2)

return (
  <motion.div
    animate="animate"
    variants={pulseVar}
    className="w-20 h-20 bg-blue-500"
  >
    Pulsing
  </motion.div>
)
```

**Parameters:**
- `minScale` (default: 0.95) - Minimum scale
- `maxScale` (default: 1.05) - Maximum scale
- `duration` (default: 2) - Pulse cycle duration

**Returns:**
- Animation variants object

---

### `useTextReveal(text: string, duration?: number)`

Character-by-character text reveal effect.

```tsx
const { ref, controls, itemVariants } = useTextReveal('Hello World', 1)

return (
  <motion.div ref={ref} initial="hidden" animate={controls}>
    {text.split('').map((char, i) => (
      <motion.span key={i} variants={itemVariants} custom={i}>
        {char}
      </motion.span>
    ))}
  </motion.div>
)
```

**Parameters:**
- `text` (required) - Text to reveal
- `duration` (default: 1) - Total animation duration

**Returns:**
- `ref` - Attach to container
- `controls` - Pass to `animate` prop
- `itemVariants` - Character animation variants (supports `custom`)

---

### `useMorphShape(paths: string[], duration?: number)`

Smooth transitions between SVG paths.

```tsx
const { currentPath } = useMorphShape([path1, path2, path3], 2)

return (
  <svg className="w-20 h-20">
    <motion.path
      d={currentPath}
      transition={{ duration: 2 }}
      fill="currentColor"
    />
  </svg>
)
```

**Parameters:**
- `paths` (required) - Array of SVG path strings
- `duration` (default: 2) - Time on each path

**Returns:**
- `currentPath` - Current SVG path
- `pathIndex` - Current path index

---

## 🎨 Advanced Usage Examples

### Staggered Card Grid

```tsx
import { motion } from 'framer-motion'
import { containerVariants, itemVariants, fadeInUp, useScrollTrigger } from '@/hooks/useAnimations'

function CardGrid({ cards }) {
  const { ref, controls } = useScrollTrigger(0.2)

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={containerVariants(0.1, fadeInUp)}
      className="grid grid-cols-3 gap-6"
    >
      {cards.map((card, i) => (
        <motion.div
          key={i}
          variants={itemVariants(fadeInUp)}
          className="p-6 bg-white rounded-lg shadow-lg"
        >
          {card.content}
        </motion.div>
      ))}
    </motion.div>
  )
}
```

### Parallax Hero Section

```tsx
import { motion } from 'framer-motion'
import { useParallax, slideUp } from '@/hooks/useAnimations'

function HeroSection() {
  const { ref: bgRef, y: bgY } = useParallax(0.5)
  const { ref: textRef, y: textY } = useParallax(0.3)

  return (
    <section className="relative h-screen overflow-hidden">
      <motion.div
        ref={bgRef}
        style={{ y: bgY }}
        className="absolute inset-0 bg-cover bg-center"
      />
      <motion.div
        ref={textRef}
        style={{ y: textY }}
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="relative h-full flex items-center justify-center"
      >
        <h1 className="text-6xl font-bold">Welcome</h1>
      </motion.div>
    </section>
  )
}
```

### Animated Statistics Counter

```tsx
import { motion } from 'framer-motion'
import { useAnimatedCounter, useScrollTrigger } from '@/hooks/useAnimations'

function StatsSection() {
  const { ref, controls } = useScrollTrigger(0.5)
  const { count: usersCount } = useAnimatedCounter(10000, 2.5)
  const { count: projectsCount } = useAnimatedCounter(250, 2.5)

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      className="grid grid-cols-2 gap-8"
    >
      <div className="text-center">
        <div className="text-5xl font-bold text-blue-600">
          {Math.round(usersCount)}+
        </div>
        <p className="text-gray-600">Active Users</p>
      </div>
      <div className="text-center">
        <div className="text-5xl font-bold text-blue-600">
          {Math.round(projectsCount)}+
        </div>
        <p className="text-gray-600">Projects</p>
      </div>
    </motion.div>
  )
}
```

### Interactive Magnetic Button Group

```tsx
import { motion } from 'framer-motion'
import { useMagneticButton } from '@/hooks/useAnimations'

function ButtonGroup() {
  return (
    <div className="flex gap-4">
      {['Button 1', 'Button 2', 'Button 3'].map((label, i) => {
        const { ref, x, y, onMouseMove, onMouseLeave } = useMagneticButton(0.4)
        
        return (
          <motion.button
            key={i}
            ref={ref}
            style={{ x, y }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg"
          >
            {label}
          </motion.button>
        )
      })}
    </div>
  )
}
```

---

## 📊 Performance Tips

1. **Use `once: true` in scroll triggers** to prevent re-animation
   ```tsx
   const { ref } = useScrollTrigger()
   ```

2. **Memoize animation variants** for better performance
   ```tsx
   const variants = useMemo(() => containerVariants(0.1), [])
   ```

3. **Use `will-change` CSS** for hardware acceleration
   ```tsx
   <motion.div className="will-change-transform" variants={slideUp}>
   ```

4. **Reduce `staggerChildren` for large lists**
   ```tsx
   variants={containerVariants(0.05)} // Smaller delay
   ```

5. **Lazy load animations** for off-screen elements
   ```tsx
   const { ref, isInView } = useScrollTrigger()
   {isInView && <AnimatedContent />}
   ```

---

## 🔧 Helper Functions

### `getVariant(name: AnimationVariant)`

Get animation variant by name string:

```tsx
const variant = getVariant('fadeInUp')
<motion.div variants={variant}>Content</motion.div>
```

**Available names:**
- fadeIn, fadeInUp, fadeInDown, fadeInLeft, fadeInRight
- slideUp, slideDown, slideLeft, slideRight
- scaleIn, scaleInCenter, scaleUp
- shimmer, shimmerPulse, glow, glowText
- bounce, bounceIn, rotate, rotateIn, flip, flipBounce

---

## 📝 Type Definitions

```tsx
type AnimationVariant =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleInCenter'
  | 'scaleUp'
  | 'shimmer'
  | 'shimmerPulse'
  | 'glow'
  | 'glowText'
  | 'bounce'
  | 'bounceIn'
  | 'rotate'
  | 'rotateIn'
  | 'flip'
  | 'flipBounce'
```

---

## 🚀 What's Included

### 21 Animation Variants
- 5 Fade animations
- 4 Slide animations
- 3 Scale animations
- 2 Shimmer effects
- 2 Glow effects
- 2 Bounce animations
- 2 Rotate animations
- 2 Flip animations

### 12 Custom Hooks
- `useScrollTrigger` - Scroll-based animations
- `useMouseFollow` - Mouse tracking effects
- `useParallax` - Parallax scrolling
- `useStaggerAnimation` - Staggered list animations
- `useHoverAnimation` - Hover/tap interactions
- `useAnimatedCounter` - Number counters
- `useAnimatedGradient` - Gradient animations
- `useMagneticButton` - Magnetic button effects
- `usePulseAnimation` - Pulse effects
- `useTextReveal` - Character reveal animations
- `useMorphShape` - SVG morphing
- And stagger utilities

### Bonus
- TypeScript support
- Performance optimized
- Accessibility-friendly
- Zero dependencies (uses Framer Motion)

---

## 🎯 Browser Support

Works on all modern browsers supporting:
- CSS Transforms
- CSS Transitions
- IntersectionObserver API

---

## 📦 Dependencies

- `framer-motion` ^12.0.0
- `react` ^19.0.0
- `react-dom` ^19.0.0

---

## 🤝 Contributing

To add new animations:

1. Add variant to `useAnimations.ts`
2. Export it at the top level
3. Add to `AnimationVariant` type
4. Include in `getVariant()` helper
5. Add demo to `AnimationsDemo.tsx`

---

## 📄 License

MIT - Feel free to use in your projects!

---

**Last Updated:** June 2025
**Version:** 1.0.0
**Maintained by:** Your Team
