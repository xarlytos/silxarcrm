# Micro-Interactions Cheat Sheet

Quick reference for the 25+ animation patterns. Copy-paste ready!

## Import Statements

```typescript
// Core animations
import * as micro from '@/utils/microInteractions'

// Advanced animations
import * as advanced from '@/utils/microInteractions-advanced'

// Ready-made components
import {
  RippleButton,
  AnimatedInput,
  SkeletonLoader,
  LoadingSpinner,
  SuccessState,
  ErrorState,
  HoverCard,
  Modal,
  DropdownMenu,
  StaggeredList,
  Toast,
  PulseBadge,
} from '@/components/ui/microInteraction-examples'

// Everything in one
import * as micro from '@/utils/microInteractions-index'
```

---

## Button Animations

### Hover + Tap Effect
```typescript
<motion.button
  variants={micro.buttonHoverVariants}
  whileHover="hover"
  whileTap="tap"
>
  Button
</motion.button>
```

### Press Animation
```typescript
<motion.button
  variants={micro.buttonPressVariants}
  whileHover="hover"
  whileTap="tap"
>
  Button
</motion.button>
```

### Ripple Button (Component)
```typescript
<RippleButton>Material Click</RippleButton>
```

---

## Form Animations

### Input Focus State
```typescript
<motion.input
  variants={micro.inputFocusVariants}
  animate={isFocused ? 'focus' : 'initial'}
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
/>
```

### Floating Label Input (Component)
```typescript
<AnimatedInput
  label="Email"
  placeholder="Enter email"
  error={errors.email}
/>
```

### Input Error
```typescript
<motion.div
  variants={micro.inputErrorVariants}
  initial="initial"
  animate="animate"
  className="text-destructive"
>
  Error message
</motion.div>
```

---

## Loading States

### Skeleton Shimmer (Component)
```typescript
<SkeletonLoader />
```

### Spinner (Component)
```typescript
<LoadingSpinner size={24} />
```

### Pulse Dots
```typescript
<motion.div
  variants={micro.pulseDotsContainerVariants}
  animate="animate"
  className="flex gap-2"
>
  {[1, 2, 3].map((i) => (
    <motion.div
      key={i}
      className="w-2 h-2 bg-primary rounded-full"
      variants={micro.pulseDotsVariants}
    />
  ))}
</motion.div>
```

---

## Success/Error States

### Success State (Component)
```typescript
<SuccessState
  message="Changes saved!"
  onDismiss={() => setShowSuccess(false)}
/>
```

### Error State (Component)
```typescript
<ErrorState
  message="Please fix errors"
  onDismiss={() => setShowError(false)}
/>
```

### Success Checkmark
```typescript
<motion.div
  variants={micro.successCheckmarkVariants}
  initial="initial"
  animate="animate"
>
  <Check className="h-6 w-6" />
</motion.div>
```

### Error Shake
```typescript
<motion.input
  variants={micro.errorShakeVariants}
  animate="animate"
/>
```

---

## Hover Effects

### Card Elevation (Component)
```typescript
<HoverCard>
  <p>Content here</p>
</HoverCard>
```

### Glow Hover
```typescript
<motion.button
  variants={micro.glowHoverVariants}
  whileHover="hover"
>
  Glow Button
</motion.button>
```

### Underline Hover
```typescript
<div className="relative inline-block">
  <a href="#">Link</a>
  <motion.div
    className="absolute bottom-0 h-1 bg-primary"
    variants={micro.underlineHoverVariants}
    whileHover="hover"
  />
</div>
```

---

## Modal & Dialog

### Modal (Component)
```typescript
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm"
>
  <p>Are you sure?</p>
</Modal>
```

### Backdrop Fade
```typescript
<motion.div
  className="fixed inset-0 bg-black/50"
  variants={micro.modalBackdropVariants}
  initial="initial"
  animate="animate"
  exit="exit"
/>
```

### Modal Content Scale
```typescript
<motion.div
  variants={micro.modalContentVariants}
  initial="initial"
  animate="animate"
  exit="exit"
>
  Content
</motion.div>
```

---

## Dropdown & Menu

### Dropdown Menu (Component)
```typescript
<DropdownMenu
  isOpen={isOpen}
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete },
  ]}
/>
```

### Menu Items Stagger
```typescript
<motion.div
  variants={micro.menuItemContainerVariants}
  initial="initial"
  animate="animate"
>
  {items.map((item) => (
    <motion.button
      key={item.label}
      variants={micro.menuItemVariants}
      whileHover="hover"
      onClick={item.onClick}
    >
      {item.label}
    </motion.button>
  ))}
</motion.div>
```

---

## Page Transitions

### Page Enter
```typescript
<motion.div
  variants={micro.pageEnterVariants}
  initial="initial"
  animate="animate"
  exit="exit"
>
  <Page />
</motion.div>
```

### Staggered List (Component)
```typescript
<StaggeredList
  items={[
    { id: '1', label: 'Item 1' },
    { id: '2', label: 'Item 2' },
  ]}
/>
```

---

## Toast Notifications

### Toast (Component)
```typescript
<Toast
  message="Action completed"
  type="success"
  duration={3000}
  onDismiss={() => setShowToast(false)}
/>
```

### Toast Types
- `'info'` - Blue
- `'success'` - Green
- `'error'` - Red

---

## Badges

### Pulse Badge (Component)
```typescript
<PulseBadge>New Feature</PulseBadge>
```

---

## Text Animations

### Text Reveal
```typescript
<motion.p
  variants={micro.textRevealVariants}
  initial="initial"
  animate="animate"
>
  Text here
</motion.p>
```

### Character Animation
```typescript
<motion.div
  variants={micro.characterContainerVariants}
  animate="animate"
>
  {'Hello'.split('').map((char) => (
    <motion.span
      key={char}
      variants={micro.characterVariants}
    >
      {char}
    </motion.span>
  ))}
</motion.div>
```

---

## Advanced Animations

### Parallax Scroll
```typescript
<motion.div
  animate={{ y: scrollY * 0.5 }}
>
  Content
</motion.div>
```

### Drag & Drop
```typescript
<motion.div
  drag
  dragElastic={0.2}
  whileDrag={{ scale: 1.05 }}
>
  Draggable
</motion.div>
```

### Swipe Gesture
```typescript
<motion.div
  onSwipe={(event, { offset, velocity }) => {
    if (offset.x > 100) handleSwipeRight()
  }}
>
  Swipeable
</motion.div>
```

### Floating Animation
```typescript
<motion.div
  animate={{ y: [0, -20, 0] }}
  transition={{ duration: 6, repeat: Infinity }}
>
  Floating
</motion.div>
```

### Blur In
```typescript
<motion.div
  variants={advanced.blurInVariants}
  initial="initial"
  animate="animate"
>
  Content
</motion.div>
```

### Rotate In
```typescript
<motion.div
  variants={advanced.rotateInVariants}
  initial="initial"
  animate="animate"
>
  Content
</motion.div>
```

### Slide In (From All Directions)
```typescript
// From left
<motion.div variants={advanced.slideInFromLeft} />

// From right
<motion.div variants={advanced.slideInFromRight} />

// From top
<motion.div variants={advanced.slideInFromTop} />

// From bottom
<motion.div variants={advanced.slideInFromBottom} />
```

### Flip Animation
```typescript
<motion.div
  variants={advanced.flipVariants}
  animate="flip"
>
  Flipping
</motion.div>
```

### Expand/Collapse
```typescript
<motion.div
  variants={advanced.expandVariants}
  animate={isExpanded ? 'expanded' : 'collapsed'}
>
  Content
</motion.div>
```

### Progress Bar
```typescript
<motion.div
  variants={advanced.progressFillVariants}
  custom={progress}
  animate="animate"
  className="h-2 bg-primary"
/>
```

### Typing Animation
```typescript
<motion.div
  variants={advanced.typingContainerVariants}
  animate="animate"
>
  {text.split('').map((char) => (
    <motion.span
      key={char}
      variants={advanced.typingCharVariants}
    >
      {char}
    </motion.span>
  ))}
</motion.div>
```

### Bounce
```typescript
<motion.div
  variants={advanced.bounceVariants}
  animate="animate"
>
  Bouncing
</motion.div>
```

### Jelly Shake
```typescript
<motion.div
  variants={advanced.jellyShakeVariants}
  animate="animate"
>
  Jelly
</motion.div>
```

### Zoom In
```typescript
<motion.div
  variants={advanced.zoomInVariants}
  initial="initial"
  animate="animate"
>
  Zoom
</motion.div>
```

### Glitch Effect
```typescript
<motion.div
  variants={advanced.glitchVariants}
  animate="animate"
>
  Glitch!
</motion.div>
```

---

## Transitions

```typescript
// Fast (150ms)
transition={micro.transitions.fast}

// Normal (300ms)
transition={micro.transitions.normal}

// Slow (500ms)
transition={micro.transitions.slow}

// Spring
transition={micro.transitions.spring}

// Spring Bouncy
transition={micro.transitions.springBouncy}
```

---

## Custom Easing

```typescript
// From advanced module
animate={{ opacity: 1 }}
transition={{
  ease: advanced.easings.elasticOut,
  duration: 0.5
}}
```

### Available Easings
- `easeIn`, `easeOut`, `easeInOut`
- `standard`, `deceleration`, `acceleration`, `sharp`
- `elasticOut`, `elasticInOut`
- `backOut`, `backInOut`
- `smooth`, `smoothEaseIn`, `smoothEaseOut`

---

## Common Patterns

### Button with Icon
```typescript
<motion.button
  variants={micro.buttonHoverVariants}
  whileHover="hover"
  whileTap="tap"
  className="flex items-center gap-2"
>
  <Icon />
  Label
</motion.button>
```

### Form Validation
```typescript
<AnimatedInput
  label="Password"
  type="password"
  error={
    password.length < 8 ? 'At least 8 characters' : undefined
  }
/>
```

### Loading With Spinner
```typescript
{isLoading ? (
  <LoadingSpinner />
) : (
  <Content />
)}
```

### Success Toast
```typescript
<AnimatePresence>
  {showSuccess && (
    <Toast
      message="Saved successfully!"
      type="success"
      duration={3000}
      onDismiss={() => setShowSuccess(false)}
    />
  )}
</AnimatePresence>
```

### Animated List
```typescript
<StaggeredList
  items={data.map((item) => ({
    id: item.id,
    label: item.name,
  }))}
/>
```

---

## Performance Tips

```typescript
// Animate transform and opacity only (GPU-accelerated)
Good:    { x: 10, y: 20, opacity: 0.5 }
Bad:     { width: 100, height: 200 }

// Use will-change CSS
<motion.div className="will-change-transform" />

// Memoize variants
const variants = useMemo(() => micro.buttonHoverVariants, [])

// Use AnimatePresence for cleanup
<AnimatePresence>
  {isVisible && <motion.div ... />}
</AnimatePresence>
```

---

## All 53 Animations

### Core (35)
1. buttonHoverVariants
2. buttonPressVariants
3. rippleVariants
4. inputFocusVariants
5. inputLabelVariants
6. inputUnderlineVariants
7. inputErrorVariants
8. skeletonShimmerVariants
9. spinnerVariants
10. pulseDotsVariants
11. pulseDotsContainerVariants
12. successCheckmarkVariants
13. successBgVariants
14. errorPulseVariants
15. errorShakeVariants
16. cardHoverVariants
17. glowHoverVariants
18. underlineHoverVariants
19. modalBackdropVariants
20. modalContentVariants
21. dropdownVariants
22. menuItemVariants
23. menuItemContainerVariants
24. pageEnterVariants
25. staggerContainerVariants
26. staggerItemVariants
27. toastEnterVariants
28. collapseVariants
29. badgePulseVariants
30. textRevealVariants
31. characterVariants
32. characterContainerVariants
33. transitions object
34. animationPresets object
35. +12 ready components

### Advanced (18)
36. parallaxVariants
37. scrollRevealVariants
38. dragVariants
39. swipeVariants
40. gestureScaleVariants
41. auroraBackgroundVariants
42. floatingVariants
43. floatingRotateVariants
44. blurInVariants
45. blurOutVariants
46. rotateInVariants
47. slideInFromLeft/Right/Top/Bottom
48. flipVariants
49. expandVariants
50. progressFillVariants
51. skeletonPulseVariants
52. typingVariants
53. bounceVariants
54. jellyShakeVariants
55. zoomInVariants
56. glitchVariants
57. morphVariants
58. gradientShiftVariants
59. complexSequences
60. easings (14 curves)
