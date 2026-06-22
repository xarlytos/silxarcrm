# Design Tokens Quick Reference Guide

## Quick Import

```typescript
import { designTokens, colors, gradients, typography, shadows, motion, spacing } from '@/lib/design-tokens'
```

---

## Color Palette (Quick Access)

### Brand Colors
```typescript
colors.brand.blue[700]      // #4F6EF7 - Primary blue
colors.brand.violet[700]    // #7B61FF - Secondary violet
colors.brand.cyan[400]      // #22D3EE - Accent cyan
```

### Text
```typescript
colors.text.primary         // #FFFFFF - Main text
colors.text.secondary       // #8A8A9A - Secondary
colors.text.muted           // #5A5A6A - Muted
colors.text.disabled        // #3A3A4A - Disabled
```

### Background
```typescript
colors.background.primary   // #06060A - Main
colors.background.elevated  // #0C0C14 - Elevated
colors.background.card      // #11111A - Cards
```

### Semantic
```typescript
colors.semantic.success.main     // #10B981
colors.semantic.warning.main     // #F59E0B
colors.semantic.error.main       // #EF4444
colors.semantic.info.main        // #3B82F6
```

---

## Most Used Tokens

### Spacing (4px grid)
```typescript
spacing['2']    // 8px   - Minimal gaps
spacing['4']    // 16px  - Standard padding ⭐ Most used
spacing['6']    // 24px  - Comfortable padding
spacing['8']    // 32px  - Large padding
spacing['16']   // 64px  - XL sections
```

### Typography Shortcuts
```typescript
typography.heading.md    // 24px, 600 weight - Section headers
typography.body.lg       // 16px, regular - Standard text ⭐ Most used
typography.label.md      // 12px, 600 weight - UI labels
```

### Shadows
```typescript
shadows.sm              // Subtle elevation
shadows.md              // Standard card shadow ⭐ Most used
shadows.lg              // Elevated card shadow
shadows.glow            // Brand blue glow ⭐ For CTAs
```

### Motion
```typescript
motion.duration.base        // 200ms ⭐ Standard transition
motion.easing.smooth        // cubic-bezier(0.4, 0, 0.2, 1) ⭐ Best easing
```

### Gradients
```typescript
gradients.accent       // Blue→Violet ⭐ Primary CTA
gradients.hero         // Vertical background
```

---

## Component Examples

### Button
```typescript
<button
  style={{
    background: gradients.accent,
    color: colors.text.primary,
    padding: `${spacing['3']} ${spacing['6']}`,
    borderRadius: borderRadius.full,
    boxShadow: shadows.glow,
    transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
  }}
>
  Click me
</button>
```

### Card
```typescript
<div
  style={{
    background: colors.background.card,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borderRadius['2xl'],
    padding: spacing['8'],
    boxShadow: shadows.cardDefault,
  }}
>
  Content
</div>
```

### Text Heading
```typescript
<h1 style={{ ...typography.heading.md, color: colors.text.primary }}>
  Section Title
</h1>
```

### Input Field
```typescript
<input
  style={{
    background: colors.surface.level1,
    color: colors.text.primary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing['3'],
    transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
  }}
/>
```

---

## Border Radius Reference

```typescript
borderRadius.full       // 9999px - Buttons & pills
borderRadius['2xl']     // 20px - Cards
borderRadius.lg         // 12px - Inputs & components ⭐ Most used
borderRadius.md         // 8px - Smaller elements
```

---

## Color Combination Cheat Sheet

### Success Patterns
```typescript
background: colors.semantic.success.light     // Light bg
color: colors.semantic.success.darkest        // Dark text
border: colors.semantic.success.main          // Border
boxShadow: shadows.glowSuccess                // Glow
```

### Warning Patterns
```typescript
background: colors.semantic.warning.light
color: colors.semantic.warning.darkest
border: colors.semantic.warning.main
boxShadow: shadows.glowWarning
```

### Error Patterns
```typescript
background: colors.semantic.error.light
color: colors.semantic.error.darkest
border: colors.semantic.error.main
boxShadow: shadows.glowError
```

---

## Animation Timing Presets

```typescript
// Fastest (micro-interactions)
transition: `all ${motion.duration.fast} ${motion.easing.smooth}` // 150ms

// Standard (most UI) ⭐ Default choice
transition: `all ${motion.duration.base} ${motion.easing.smooth}` // 200ms

// Slower (deliberate motion)
transition: `all ${motion.duration.slow} ${motion.easing.smooth}` // 300ms

// Slowest (hero animations)
transition: `all ${motion.duration.slowest} ${motion.easing.smooth}` // 800ms
```

---

## Common Recipes

### Hover Effect (Elevation)
```typescript
'&:hover': {
  transform: 'translateY(-2px)',
  boxShadow: shadows.lg,
}
```

### Focus State (Input)
```typescript
'&:focus': {
  borderColor: colors.border.focus,
  boxShadow: `0 0 0 3px rgba(79, 110, 247, 0.1)`,
}
```

### Disabled State
```typescript
'&:disabled': {
  opacity: 0.5,
  cursor: 'not-allowed',
  color: colors.text.disabled,
}
```

### Active State
```typescript
'&:active': {
  transform: 'scale(0.98)',
}
```

---

## Spacing Guidelines

### Common Padding Patterns
```typescript
// Compact component
padding: `${spacing['2']} ${spacing['3']}`    // 8px 12px

// Standard component (⭐ most common)
padding: `${spacing['3']} ${spacing['4']}`    // 12px 16px

// Spacious component
padding: spacing['6']                          // 24px all sides

// Large section
padding: spacing['8']                          // 32px all sides
```

### Common Gap Patterns
```typescript
// Tight grouping
gap: spacing['2']     // 8px

// Standard spacing (⭐ most common)
gap: spacing['4']     // 16px

// Loose spacing
gap: spacing['6']     // 24px

// Extra loose
gap: spacing['8']     // 32px
```

---

## Dark/Light Mode Switching

### Light Mode Colors
```typescript
colors.light.background         // #F8F8FB
colors.light.backgroundSecondary // #FFFFFF
colors.light.text               // #0A0A12
colors.light.textSecondary      // #5A5A6A
colors.light.border             // rgba(0,0,0,0.08)
```

---

## Gradient Combos

### For CTAs
```typescript
background: gradients.accent    // Blue→Violet ⭐ Primary
// or
background: gradients.violetToCyan // Violet→Cyan (Modern)
```

### For Hero Sections
```typescript
background: gradients.hero      // Vertical fade
// or
background: gradients.aurora    // Animated effect
```

### For Cards
```typescript
background: colors.background.card
backgroundImage: gradients.card // Subtle overlay
```

---

## Responsive Spacing Strategy

```typescript
// Mobile: spacing['4'] (16px)
// Tablet: spacing['6'] (24px)
// Desktop: spacing['8'] (32px)

// Use semantic spacing helpers:
spacingVariants.component.md    // 16px
spacingVariants.section.md      // 48px
spacingVariants.gap.lg          // 16px
```

---

## Typography Hierarchy at a Glance

```
Display XL   56px | 800 weight  ← Hero headlines
Display LG   48px | 800 weight
Display MD   40px | 700 weight

Heading XL   32px | 700 weight  ← Section titles
Heading LG   28px | 700 weight
Heading MD   24px | 600 weight  ⭐ Most used
Heading SM   20px | 600 weight

Body XL      18px | 400 weight  ← Paragraphs
Body LG      16px | 400 weight  ⭐ Standard text
Body MD      15px | 400 weight
Body SM      14px | 400 weight

Label LG     14px | 600 weight  ← UI labels
Label MD     12px | 600 weight  ⭐ Most used
Label SM     11px | 600 weight

Code MD      13px | 500 weight  ← Code snippets
```

---

## Border & Shadow Elevation Scale

```
Level 1 (Flat)       - No shadow
Level 2 (Subtle)     - shadows.sm (1px 2px)
Level 3 (Standard)   - shadows.md (4px 12px) ⭐ Cards
Level 4 (Elevated)   - shadows.lg (8px 32px)
Level 5 (Modal)      - shadows.xl (12px 48px)
Level 6 (Deepest)    - shadows['2xl'] (20px 64px)

+ Optional Glow      - shadows.glow, glowLg, glowXl
```

---

## Tips & Tricks

1. **Always use `motion.easing.smooth`** - Most polished easing
2. **Spacing['4'] is your baseline** - Use it as foundation
3. **Layer shadows** - `${shadows.md}, ${shadows.glow}` for emphasis
4. **Use semantic colors** - Don't hardcode brand colors
5. **Typography scale > custom sizes** - Maintains consistency
6. **Border radius['lg'] for inputs** - Slightly rounded, professional
7. **Gradients for CTAs** - Draws attention naturally
8. **Inset shadows for depth** - `shadows.insetMd` for embossing

---

## Files Location

- **Tokens**: `src/lib/design-tokens.ts`
- **Components**: `src/lib/design-tokens-usage.tsx`
- **Full Docs**: `DESIGN_SYSTEM_IMPROVEMENTS.md`

---

**Last Updated**: June 22, 2025 | **Version**: 2.0
