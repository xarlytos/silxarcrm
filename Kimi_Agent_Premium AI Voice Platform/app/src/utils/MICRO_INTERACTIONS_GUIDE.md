# Micro-Interactions Guide

Comprehensive animation patterns for UI micro-interactions using Framer Motion + Tailwind CSS.

## Overview

Micro-interactions are small, purposeful animations that provide feedback and enhance user experience. This library includes **15+ pre-built animation patterns** ready for immediate use.

## Installation

Already included in the project:
- `framer-motion` (v12.40.0)
- `tailwindcss` (v3.4.19)

## File Structure

```
src/
├── utils/
│   ├── microInteractions.ts           # Core animation variants
│   └── MICRO_INTERACTIONS_GUIDE.md    # This file
└── components/
    └── ui/
        └── microInteraction-examples.tsx  # Ready-to-use components
```

## Quick Start

### 1. Import Animation Variants

```typescript
import * as micro from '@/utils/microInteractions'
import { motion } from 'framer-motion'

// Use in component
<motion.button
  variants={micro.buttonHoverVariants}
  whileHover="hover"
  whileTap="tap"
>
  Click me
</motion.button>
```

### 2. Use Preset Animations

```typescript
import { animationPresets } from '@/utils/microInteractions'

<motion.div
  {...animationPresets.buttonPress}
>
  Animated Button
</motion.div>
```

### 3. Copy Ready-Made Components

```typescript
import {
  RippleButton,
  AnimatedInput,
  SkeletonLoader,
  SuccessState,
  ErrorState,
} from '@/components/ui/microInteraction-examples'

export function MyPage() {
  return (
    <div>
      <RippleButton>Click with ripple effect</RippleButton>
      <AnimatedInput label="Email" placeholder="Enter email" />
      <SkeletonLoader />
    </div>
  )
}
```

## Animation Categories

### 1. Button Interactions

#### Button Hover & Tap
- **File**: `microInteractions.ts`
- **Variants**: `buttonHoverVariants`, `buttonPressVariants`
- **Use case**: Primary and secondary buttons

```typescript
<motion.button
  className="px-4 py-2 bg-primary text-white rounded-md"
  variants={micro.buttonHoverVariants}
  whileHover="hover"
  whileTap="tap"
>
  Button
</motion.button>
```

#### Ripple Effect
- **Component**: `RippleButton`
- **Use case**: Material Design style interactions

```typescript
<RippleButton>Material Click</RippleButton>
```

---

### 2. Form Field Animations

#### Input Focus State
- **Variants**: `inputFocusVariants`, `inputLabelVariants`, `inputUnderlineVariants`
- **Use case**: Enhanced form interactions

```typescript
<motion.input
  variants={micro.inputFocusVariants}
  animate={isFocused ? 'focus' : 'initial'}
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
/>
```

#### Floating Label
- **Component**: `AnimatedInput`
- **Features**: Label floats up on focus, error state support

```typescript
<AnimatedInput
  label="Email"
  placeholder="Enter your email"
  error={error ? 'Email is invalid' : undefined}
/>
```

#### Input Error Animation
- **Variants**: `inputErrorVariants`
- **Animations**: Fade in + shake

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

### 3. Loading States

#### Skeleton Shimmer
- **Variant**: `skeletonShimmerVariants`
- **Component**: `SkeletonLoader`
- **Use case**: Content placeholders while loading

```typescript
<SkeletonLoader />
```

#### Spinner
- **Variant**: `spinnerVariants`
- **Component**: `LoadingSpinner`
- **Use case**: Indeterminate loading

```typescript
<LoadingSpinner size={24} />
```

#### Pulse Dots
- **Variants**: `pulseDotsVariants`, `pulseDotsContainerVariants`
- **Use case**: Sequential pulsing indicators

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

### 4. Success/Error States

#### Success Checkmark
- **Component**: `SuccessState`
- **Animations**: Scale up + checkmark pop
- **Duration**: ~0.4s

```typescript
<SuccessState
  message="Changes saved successfully"
  onDismiss={() => setShowSuccess(false)}
/>
```

#### Error with Shake
- **Component**: `ErrorState`
- **Animation**: Shake left-right
- **Duration**: ~0.5s

```typescript
<ErrorState
  message="Please correct the errors below"
  onDismiss={() => setShowError(false)}
/>
```

#### Error Pulse
- **Variant**: `errorPulseVariants`
- **Use case**: Subtle error feedback

```typescript
<motion.div
  variants={micro.errorPulseVariants}
  animate="animate"
  className="text-destructive"
>
  Error text
</motion.div>
```

---

### 5. Hover & Interaction Feedback

#### Card Elevation
- **Component**: `HoverCard`
- **Effect**: Lifts up + adds glow shadow
- **Variants**: `cardHoverVariants`

```typescript
<HoverCard>
  <p>Hover to elevate card</p>
</HoverCard>
```

#### Glow Hover
- **Variant**: `glowHoverVariants`
- **Use case**: Interactive elements with glow effect

```typescript
<motion.button
  variants={micro.glowHoverVariants}
  whileHover="hover"
  className="px-4 py-2 rounded-md"
>
  Glowing Button
</motion.button>
```

#### Underline Hover
- **Variant**: `underlineHoverVariants`
- **Use case**: Link underlines that animate

```typescript
<div className="relative inline-block">
  <a href="#">Hover me</a>
  <motion.div
    className="absolute bottom-0 left-0 h-0.5 bg-primary"
    variants={micro.underlineHoverVariants}
    whileHover="hover"
  />
</div>
```

---

### 6. Modal & Dialog

#### Modal Entrance
- **Component**: `Modal`
- **Backdrop**: Fade in
- **Content**: Scale + slide up
- **Exit**: Reverse animation

```typescript
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
</Modal>
```

---

### 7. Dropdown & Menu

#### Dropdown Entrance
- **Component**: `DropdownMenu`
- **Animation**: Slide down + scale
- **Duration**: ~0.2s

```typescript
<DropdownMenu
  isOpen={isOpen}
  items={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete },
  ]}
/>
```

#### Menu Items
- **Variants**: `menuItemVariants`, `menuItemContainerVariants`
- **Features**: Staggered entrance + hover effects

---

### 8. Page Transitions

#### Page Enter
- **Variant**: `pageEnterVariants`
- **Use case**: Route transitions
- **Duration**: ~0.4s

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

#### Staggered List
- **Component**: `StaggeredList`
- **Effect**: Each item animates in sequentially
- **Delay between items**: 0.1s

```typescript
<StaggeredList
  items={[
    { id: '1', label: 'Item 1' },
    { id: '2', label: 'Item 2' },
    { id: '3', label: 'Item 3' },
  ]}
/>
```

---

### 9. Toast Notifications

#### Toast Enter
- **Component**: `Toast`
- **Animation**: Slide in from right
- **Duration**: Configurable (default 3s)

```typescript
<Toast
  message="Action completed"
  type="success"
  duration={3000}
  onDismiss={() => setShowToast(false)}
/>
```

---

### 10. Badge Animations

#### Badge Pulse
- **Component**: `PulseBadge`
- **Effect**: Pulse + glow rings
- **Duration**: 2s loop

```typescript
<PulseBadge>New Feature</PulseBadge>
```

---

### 11. Text Animations

#### Text Reveal
- **Variant**: `textRevealVariants`
- **Use case**: Text entrance animations

```typescript
<motion.p
  variants={micro.textRevealVariants}
  initial="initial"
  animate="animate"
>
  Reveal this text
</motion.p>
```

#### Character Animation
- **Variants**: `characterVariants`, `characterContainerVariants`
- **Use case**: Letter-by-letter animations

```typescript
<motion.div
  variants={micro.characterContainerVariants}
  animate="animate"
>
  {'Text'.split('').map((char) => (
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

## Transition Presets

Pre-configured transition objects for consistency:

```typescript
import { transitions } from '@/utils/microInteractions'

// Fast transition (150ms)
<motion.div transition={transitions.fast} />

// Normal transition (300ms)
<motion.div transition={transitions.normal} />

// Slow transition (500ms)
<motion.div transition={transitions.slow} />

// Spring animation
<motion.div transition={transitions.spring} />

// Bouncy spring
<motion.div transition={transitions.springBouncy} />
```

---

## Animation Preset Reference

Quick reference for complete animations:

```typescript
import { animationPresets } from '@/utils/microInteractions'

animationPresets.buttonPress        // Scale on hover/tap
animationPresets.cardElevate        // Lift + glow on hover
animationPresets.inputFocus         // Focus ring animation
animationPresets.errorShake         // Shake animation
animationPresets.successPop         // Pop entrance
animationPresets.loadingSpinner     // Rotating loader
animationPresets.pulse              // Pulse effect
animationPresets.skeletonShimmer    // Shimmer effect
```

---

## Customization

### Modify Animation Duration

```typescript
const customVariants: Variants = {
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,  // Change from 0.3
      ease: 'easeOut',
    },
  },
}
```

### Combine Multiple Animations

```typescript
<motion.button
  variants={micro.buttonHoverVariants}
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.4 }}
  whileHover="hover"
  whileTap="tap"
>
  Complex Button
</motion.button>
```

### Create Custom Variants

```typescript
import { Variants } from 'framer-motion'

const customPulse: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
}
```

---

## Performance Tips

### 1. Use `will-change` CSS
```typescript
<motion.div
  className="will-change-transform"
  animate={{ y: [0, -10, 0] }}
/>
```

### 2. Reduce Animation Complexity
- Animate transform and opacity only (GPU-accelerated)
- Avoid animating layout properties

### 3. Use `AnimatePresence` for Unmounting
```typescript
import { AnimatePresence } from 'framer-motion'

<AnimatePresence>
  {isVisible && <motion.div ... />}
</AnimatePresence>
```

### 4. Memoize Variants
```typescript
const memoizedVariants = useMemo(() => micro.buttonHoverVariants, [])
```

---

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

---

## Animation Timing

| Duration | Use Case |
|----------|----------|
| 0.15s | Fast feedback, ripples |
| 0.2-0.3s | Input focus, dropdowns |
| 0.4-0.5s | Page transitions, modals |
| 2-3s | Loops (pulse, shimmer) |

---

## Common Patterns

### Loading State with Fallback
```typescript
{isLoading ? <LoadingSpinner /> : <Content />}
```

### Form with Error Feedback
```typescript
<AnimatedInput
  label="Email"
  error={formErrors.email}
  onBlur={handleBlur}
/>
```

### Success/Error Toast Stack
```typescript
<div className="fixed bottom-4 right-4 space-y-2">
  <AnimatePresence>
    {notifications.map((notif) => (
      <Toast key={notif.id} {...notif} />
    ))}
  </AnimatePresence>
</div>
```

---

## Troubleshooting

### Animation Not Working
1. Ensure `motion.div` (not `<div>`) is used
2. Check that `animate` prop is set
3. Verify variant names match

### Performance Issues
1. Use `will-change-transform` class
2. Reduce number of animated elements
3. Use `layoutId` for shared layout animations
4. Profile with DevTools

### Staggered Animation Too Fast/Slow
Adjust `delayChildren` and `staggerChildren`:
```typescript
transition: {
  staggerChildren: 0.1,      // Increase for slower
  delayChildren: 0.2,        // Increase for delay
}
```

---

## See Also

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
- [`microInteraction-examples.tsx`](../components/ui/microInteraction-examples.tsx) - Component examples
