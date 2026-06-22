# Animation System - Quick Reference

## Import Essentials

```typescript
// Global animations
import { 
  duration, easing, spacing,
  containerVariants, itemSlideUp, pageTransition, 
  hoverLift, scrollReveal, loadingSpinner
} from '@/lib/animations'

// Scroll hooks
import { useScrollEffects, useParallax, useRevealOnScroll } from '@/hooks/useScrollEffects'
import { useParallaxScroll, useSmoothScroll, useMouseParallax } from '@/hooks/useParallaxScroll'

// Components
import ScrollReveal from '@/components/ScrollReveal'
import { StaggeredList, AnimatedSpinner, RevealedSection, GradientText } from '@/components/AnimatedElements'

// Framer Motion
import { motion, AnimatePresence } from 'framer-motion'
```

---

## Timing Cheat Sheet

| Duration | Value | Use Case |
|----------|-------|----------|
| Fastest | 150ms | Button clicks, quick feedback |
| Fast | 200ms | Hover states, micro-interactions |
| Base | 300ms | Standard animations, elements |
| Slow | 500ms | Important reveals, entrance |
| Slowest | 700ms | Large transitions, heroes |

```typescript
// Example: Use in any animation
transition: { duration: duration.base / 1000 }
```

---

## Common Patterns

### Staggered List
```tsx
<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.li key={item.id} variants={itemSlideUp}>
      {item.label}
    </motion.li>
  ))}
</motion.ul>
```

### Page Transition (Automatic in Layout)
```tsx
// Already handled! Pages auto-transition
// Just use: <Outlet />
```

### Scroll Reveal
```tsx
<ScrollReveal variant="slideUp" delay={0.1}>
  <Card>Content</Card>
</ScrollReveal>
```

### Parallax Hero
```tsx
const { y } = useParallaxScroll(0.5)
<motion.div style={{ y }}>Background Image</motion.div>
```

### Hover Animation
```tsx
<motion.div variants={hoverLift} initial="initial" whileHover="hover">
  Hover me
</motion.div>
```

### Loading Spinner
```tsx
<AnimatedSpinner />
```

### Staggered Grid
```tsx
<StaggeredGrid items={items} columns={3} />
```

---

## Spacing Quick Ref

```
xs  → 3px    (margins, gaps)
sm  → 6px    (small gaps)
md  → 12px   (medium padding)
lg  → 16px   ← STANDARD PADDING
xl  → 24px   (card padding)
2xl → 32px   (section padding)
3xl → 48px   (large sections)
```

Use via Tailwind: `p-4 m-6 gap-8` or constants: `spacing.lg`

---

## Easing Quick Ref

| Easing | Character | Best For |
|--------|-----------|----------|
| easeOut | Natural, smooth | Entrances, appears |
| easeIn | Accelerating | Exits, disappears |
| easeInOut | Balanced | Continuous motion |
| sharp | Quick, snappy | Exit animations |
| bouncy | Spring-like | Playful effects |
| elastic | Stretched | Emphasis animations |
| smooth | Curve-based | Relaxed motion |

---

## Component Gallery (Pre-made)

### Loaders
```tsx
<AnimatedSpinner />
<SkeletonLoader count={3} />
<PageLoader />
```

### Lists & Grids
```tsx
<StaggeredList items={items} />
<StaggeredGrid items={items} columns={3} />
```

### Effects
```tsx
<FloatingElement>Content</FloatingElement>
<PulsingElement>Content</PulsingElement>
```

### UI Elements
```tsx
<ProgressIndicator progress={0.7} />
<PulseBadge label="New" variant="primary" />
<Countdown from={10} onComplete={() => {}} />
<GradientText animated>Animated Text</GradientText>
```

### Sections
```tsx
<RevealedSection title="Title" subtitle="Subtitle">
  Content
</RevealedSection>
```

---

## Scroll Effects Cheat Sheet

### Scroll Progress
```tsx
const { scrollProgress } = useScrollEffects()
<motion.div style={{ opacity: scrollProgress }} />
```

### Scroll Direction
```tsx
const { scrollDirection } = useScrollEffects()
{scrollDirection === 'down' ? <Hide navbar /> : <Show navbar />}
```

### Parallax Scroll
```tsx
const { y } = useParallaxScroll(0.5)
<motion.div style={{ y }}>Parallax element</motion.div>
```

### Smooth Scroll
```tsx
const { scrollToElement } = useSmoothScroll()
<button onClick={() => scrollToElement('target-id')}>Go</button>
```

### Mouse Parallax
```tsx
const containerRef = useRef(null)
const { x, y } = useMouseParallax(containerRef, 15)
<div ref={containerRef}>
  <motion.img style={{ x, y }} />
</div>
```

---

## Modal Pattern

```tsx
<AnimatePresence mode="wait">
  {isOpen && (
    <>
      <motion.div variants={modalBackdropVariants} onClick={close} />
      <motion.div variants={modalContentVariants}>
        Content
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

## Animation Variants Reference

### Available Variants
- `containerVariants` - Parent for staggered children
- `itemSlideUp/Down/Left/Right` - Directional slides
- `itemFadeIn` - Fade only
- `itemScale` - Scale up from smaller
- `itemRotateIn` - Rotate entrance
- `pageTransition` - Page transitions
- `hoverLift/Scale/ScaleSmall/Brighten` - Hover states
- `scrollReveal/scrollFadeIn` - Scroll-triggered
- `loadingSpinner/loadingPulse` - Loading states
- `modalBackdropVariants/modalContentVariants` - Modal animations

---

## Layout Structure (Auto-Enhanced)

```tsx
<Layout>
  <Navbar /> ← Animated in
  <main>
    <AnimatePresence>
      <Routes>
        <Route path="/" element={<Home />} /> ← Auto page transition
      </Routes>
    </AnimatePresence>
  </main>
  <Footer /> ← Animated in
  <ScrollProgressBar /> ← Shows scroll position
</Layout>
```

---

## Performance Tips

1. **Use `once: true`** in ScrollReveal to prevent re-animation
2. **Prefer GPU properties**: transform, opacity (not width, height)
3. **Keep animations <500ms** for interactions
4. **Use passive listeners** - already implemented
5. **Batch animations** with stagger instead of sequential
6. **Memoize motion values** - already done in hooks

---

## Common Mistakes ❌

```tsx
// ❌ Animating wrong properties
animate={{ width: 100 }}  // Bad for performance

// ✅ Use transforms instead
animate={{ scaleX: 1 }}

// ❌ Forgetting exit animations
<AnimatePresence>
  {isOpen && <Modal />}  // Exit won't animate
</AnimatePresence>

// ✅ Always wrap with AnimatePresence
<AnimatePresence mode="wait">
  {isOpen && <Modal exit={{ opacity: 0 }} />}
</AnimatePresence>

// ❌ Re-creating variants in render
export function Comp() {
  const variants = { ... }  // Re-creates every render
  return <motion.div variants={variants} />
}

// ✅ Define outside component or use constants
import { itemSlideUp } from '@/lib/animations'
export function Comp() {
  return <motion.div variants={itemSlideUp} />
}
```

---

## Files Reference

| File | Purpose | Exports |
|------|---------|---------|
| `animations.ts` | Global constants & variants | 40+ exports |
| `useScrollEffects.ts` | Scroll-based utilities | 5 hooks |
| `useParallaxScroll.ts` | Advanced scroll effects | 6 hooks |
| `ScrollReveal.tsx` | Scroll-triggered component | 1 component |
| `AnimatedElements.tsx` | Pre-made components | 12 components |
| `Layout.tsx` | App layout (enhanced) | Auto-transitions |

---

## One-Liners

```tsx
// Fade in text on load
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Text</motion.div>

// Bounce entrance
<motion.div animate={{ y: 0 }} initial={{ y: 20 }} transition={{ bounce: 0.6 }}>Hi</motion.div>

// Scale on hover
<motion.div whileHover={{ scale: 1.05 }}>Button</motion.div>

// Rotate on tap
<motion.div whileTap={{ rotate: 10 }}>Tap me</motion.div>

// List stagger
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(i => <motion.div key={i.id} variants={itemSlideUp}>{i.name}</motion.div>)}
</motion.div>
```

---

## Quick Debug

### Check if scroll is working
```tsx
const { scrollProgress, scrollY, scrollDirection } = useScrollEffects()
console.log(scrollProgress, scrollY, scrollDirection)
```

### Test parallax
```tsx
const { y } = useParallaxScroll(0.5)
// If no movement, check overflow:hidden isn't cutting it off
```

### Verify stagger timing
```tsx
// Stagger should space items by this amount
staggerChildren: 0.1  // 100ms between items
```

---

## Resources

- Full Guide: `src/lib/ANIMATION_GUIDE.md`
- Examples: `src/components/AnimatedElements.tsx`
- Implementation: `src/components/Layout.tsx`
