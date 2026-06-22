# Design Tokens Implementation Checklist

## Phase 1: Foundation (Week 1)

### Setup
- [ ] Copy `design-tokens.ts` to `src/lib/`
- [ ] Review `DESIGN_SYSTEM_IMPROVEMENTS.md` (comprehensive guide)
- [ ] Keep `DESIGN_TOKENS_QUICK_REFERENCE.md` as desk reference
- [ ] Install required dependencies (all already in package.json)

### Initial Integration
- [ ] Import tokens in your main App component
- [ ] Test TypeScript intellisense for autocomplete
- [ ] Verify token values match current design
- [ ] Update `src/index.css` to map tokens as CSS custom properties (optional)

### Component Updates (Priority Order)
- [ ] **Buttons** (highest usage)
  - [ ] Primary button → use `gradients.accent` + `shadows.glow`
  - [ ] Secondary button → use `border.default` + transparent bg
  - [ ] Ghost button → transparent bg only
  - [ ] Reference: `components.button` tokens

- [ ] **Cards** (medium usage)
  - [ ] Default cards → use `background.card` + `border.subtle`
  - [ ] Elevated cards → use `surface.level2` + `shadows.lg`
  - [ ] Interactive cards → add hover state with `cardHover` shadow
  - [ ] Reference: `components.card` tokens

- [ ] **Text Elements** (all content)
  - [ ] Headings → use `typography.heading.*` scale
  - [ ] Body text → use `typography.body.lg` or `.md`
  - [ ] Labels → use `typography.label.md` or `.lg`
  - [ ] Captions → use `typography.label.sm` + `colors.text.muted`

- [ ] **Input Fields** (forms)
  - [ ] Background → `colors.surface.level1`
  - [ ] Border → `colors.border.default` → `colors.border.focus` on focus
  - [ ] Focus glow → `0 0 0 3px rgba(79, 110, 247, 0.1)`
  - [ ] Padding → `spacing['3'] spacing['4']`

- [ ] **Spacing** throughout app
  - [ ] Component padding → `spacingVariants.component.md`
  - [ ] Section padding → `spacingVariants.section.md`
  - [ ] Gaps between elements → `spacingVariants.gap.lg`

---

## Phase 2: Polish (Week 2)

### Micro-interactions
- [ ] Hover states on all clickable elements
- [ ] Use `motion.duration.base` (200ms) for standard transitions
- [ ] Use `motion.easing.smooth` for all easing functions
- [ ] Add elevation change: `transform: translateY(-2px)` on hover

### Semantic Colors
- [ ] Replace hardcoded alert colors with `colors.semantic.*`
- [ ] Success states → `colors.semantic.success` variants
- [ ] Warning states → `colors.semantic.warning` variants
- [ ] Error states → `colors.semantic.error` variants
- [ ] Info states → `colors.semantic.info` variants

### Advanced Shadows
- [ ] Add glow effects to CTAs: `shadows.glow` or `shadows.glowLg`
- [ ] Use color-specific glows: `shadows.glowSuccess`, etc.
- [ ] Layer shadows: primary + glow for emphasis
- [ ] Test inset shadows for depth: `shadows.insetMd`

### Gradient Enhancements
- [ ] Review gradient usage in components
- [ ] Replace basic color fills with gradients where appropriate
- [ ] Test multi-directional gradients: 45°, 135°, 225°, 315°
- [ ] Consider aurora effect for large backgrounds

---

## Phase 3: Documentation (Week 3)

### Code Documentation
- [ ] Add JSDoc comments to custom components using tokens
- [ ] Document token selections in component prop types
- [ ] Create Storybook stories (optional but recommended)
- [ ] Export component examples from `design-tokens-usage.tsx`

### Design Handoff
- [ ] Share token structure with design team
- [ ] Map Figma colors to token names
- [ ] Create token reference in Figma (FigJam or plugin)
- [ ] Document color contrast ratios for WCAG compliance

### Team Training
- [ ] Share `DESIGN_TOKENS_QUICK_REFERENCE.md` with team
- [ ] Conduct 30-min token overview session
- [ ] Create internal wiki/documentation
- [ ] Set up linting rules (no magic color values)

---

## Phase 4: Maintenance (Ongoing)

### Code Quality
- [ ] Use ESLint plugin to prevent hardcoded colors/spacing
- [ ] Enforce token usage in PR reviews
- [ ] Update tokens in single location for global changes
- [ ] Version control tokens with semantic versioning

### Performance
- [ ] Consider CSS custom properties for runtime theming
- [ ] Generate optimized token file for production
- [ ] Test bundle size impact (should be minimal)
- [ ] Monitor animation performance on lower-end devices

### Evolution
- [ ] Gather feedback on token naming
- [ ] Add new tokens as design patterns emerge
- [ ] Deprecate unused tokens quarterly
- [ ] Keep documentation in sync with code

---

## Implementation Examples

### Before (Without Tokens)
```typescript
<button
  style={{
    background: 'linear-gradient(135deg, #4F6EF7 0%, #7B61FF 100%)',
    color: '#FFFFFF',
    padding: '12px 24px',
    borderRadius: '9999px',
    boxShadow: '0 0 20px rgba(79,110,247,0.3)',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  }}
>
  Click me
</button>
```

### After (With Tokens)
```typescript
import { gradients, colors, shadows, spacing, motion, typography } from '@/lib/design-tokens'

<button
  style={{
    background: gradients.accent,
    color: colors.text.primary,
    padding: `${spacing['3']} ${spacing['6']}`,
    borderRadius: '9999px',
    boxShadow: shadows.glow,
    ...typography.body.md,
    fontWeight: '600',
    transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
  }}
>
  Click me
</button>
```

**Benefits**:
- Single source of truth for design values
- Easy global updates
- Consistent styling
- Better maintainability
- Type safety with TypeScript

---

## Quick Start Template

### For New Components
```typescript
import {
  colors,
  gradients,
  shadows,
  spacing,
  typography,
  borderRadius,
  motion,
} from '@/lib/design-tokens'

export const MyComponent = () => {
  return (
    <div
      style={{
        background: colors.background.card,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: borderRadius.lg,
        padding: spacing['6'],
        boxShadow: shadows.md,
        transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
      }}
    >
      <h2 style={{ ...typography.heading.md, color: colors.text.primary }}>
        Title
      </h2>
      <p style={{ ...typography.body.lg, color: colors.text.secondary }}>
        Description
      </p>
    </div>
  )
}
```

---

## Token Structure at a Glance

```
design-tokens.ts
├── colors
│   ├── background (primary, elevated, card, etc.)
│   ├── surface (levels 1-3)
│   ├── text (primary, secondary, tertiary, muted, disabled)
│   ├── brand (blue, violet, cyan with full spectrum)
│   ├── semantic (success, warning, error, info)
│   ├── border (subtle, default, hover, active, focus)
│   └── light (for light mode)
│
├── gradients
│   ├── hero, accent, card
│   ├── brand combinations (blueToViolet, violetToCyan, etc.)
│   ├── semantic (successGradient, warningGradient, etc.)
│   └── directional (toBottom, angle45, etc.)
│
├── typography
│   ├── display (xl, lg, md)
│   ├── heading (xl, lg, md, sm, xs)
│   ├── body (xl, lg, md, sm, xs)
│   ├── label (lg, md, sm)
│   └── code (lg, md, sm)
│
├── shadows & blur
│   ├── shadows (xs, sm, md, lg, xl, 2xl)
│   ├── glows (glow, glowLg, glowXl)
│   ├── color-specific glows
│   ├── blur (0-2xl)
│   └── backdropBlur (0-2xl)
│
├── spacing
│   ├── base scale (0-64 in 4px increments)
│   └── semantic variants (component, section, gap)
│
├── borderRadius
│   └── none, xs, sm, md, lg, xl, 2xl, full
│
├── motion
│   ├── duration (fast, base, slow, slower, slowest)
│   └── easing (linear, standard, optimized, spring-like)
│
└── components (pre-composed tokens)
    ├── button
    ├── card
    ├── input
    └── text
```

---

## Common Mistakes to Avoid

❌ **Don't:**
- Hardcode color values
- Use inconsistent spacing values
- Skip motion transitions
- Mix easing functions
- Use arbitrary shadow values
- Inconsistent typography sizes

✅ **Do:**
- Import tokens at component top
- Use token names as identifiers
- Combine tokens for complex effects
- Use `motion.easing.smooth` as default
- Reference documentation when unsure
- Ask team for token additions vs. creating new values

---

## Helpful Terminal Commands

```bash
# Search for hardcoded colors (audit)
grep -r "#[0-9A-Fa-f]\{6\}" src/ --include="*.ts" --include="*.tsx"

# Search for missing token usage
grep -r "rgba(" src/ --include="*.ts" --include="*.tsx"

# Check token file syntax
npx tsc --noEmit src/lib/design-tokens.ts

# Count token exports
grep "export const" src/lib/design-tokens.ts | wc -l
```

---

## Support & Resources

- **Quick Reference**: `DESIGN_TOKENS_QUICK_REFERENCE.md` (bookmark this!)
- **Full Documentation**: `DESIGN_SYSTEM_IMPROVEMENTS.md`
- **Code Examples**: `src/lib/design-tokens-usage.tsx`
- **TypeScript Definition**: `src/lib/design-tokens.ts`

---

## Completion Checklist

### Phase 1 Progress
- [ ] All files copied to correct locations
- [ ] TypeScript intellisense working
- [ ] Core components using tokens (buttons, cards, text)
- [ ] No console errors or warnings

### Phase 2 Progress
- [ ] All hover states implemented
- [ ] Semantic colors applied
- [ ] Motion transitions consistent
- [ ] Visual polish complete

### Phase 3 Progress
- [ ] Documentation complete
- [ ] Team trained on tokens
- [ ] Figma design system updated
- [ ] Code examples added

### Phase 4 Progress
- [ ] Linting rules enforced
- [ ] Token usage audited
- [ ] Performance tested
- [ ] Team adopting tokens consistently

---

**Status**: Production Ready
**Version**: 2.0
**Last Updated**: June 22, 2025
