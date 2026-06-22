/**
 * Design Tokens Usage Guide & Component Examples
 *
 * This file demonstrates practical implementation of design tokens
 * in React components with real-world examples.
 */

import React, { useState } from 'react'
import { designTokens, colors, gradients, typography, shadows, motion, spacing } from './design-tokens'

// ============================================================================
// BUTTON COMPONENTS
// ============================================================================

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

/**
 * Reusable Button Component using design tokens
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      borderRadius: '9999px',
      transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
      cursor: 'pointer',
      border: 'none',
      fontSize: '15px',
    } as React.CSSProperties

    const sizeStyles = {
      sm: { padding: `${spacing['2']} ${spacing['3']}` },
      md: { padding: `${spacing['3']} ${spacing['6']}` },
      lg: { padding: `${spacing['4']} ${spacing['8']}` },
    }

    const variantStyles = {
      primary: {
        background: gradients.accent,
        color: colors.text.primary,
        boxShadow: shadows.glow,
        '&:hover': {
          boxShadow: shadows.glowLg,
          transform: 'scale(1.02)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      },
      secondary: {
        background: 'transparent',
        color: colors.text.primary,
        border: `1px solid ${colors.border.default}`,
        '&:hover': {
          borderColor: colors.border.hover,
          background: `rgba(255, 255, 255, 0.05)`,
        },
      },
      ghost: {
        background: 'transparent',
        color: colors.text.primary,
        '&:hover': {
          background: `rgba(255, 255, 255, 0.08)`,
        },
      },
    }

    return (
      <button
        ref={ref}
        style={{
          ...baseStyles,
          ...sizeStyles[size],
          ...variantStyles[variant],
        }}
        className={className}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'elevated' | 'interactive'
  className?: string
}

/**
 * Reusable Card Component with elevation variants
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', className = '' }, ref) => {
    const variantStyles = {
      default: {
        background: colors.background.card,
        border: `1px solid ${colors.border.subtle}`,
        boxShadow: shadows.cardDefault,
      },
      elevated: {
        background: colors.surface.level2,
        border: `1px solid ${colors.border.default}`,
        boxShadow: shadows.lg,
      },
      interactive: {
        background: colors.background.card,
        border: `1px solid ${colors.border.subtle}`,
        boxShadow: shadows.cardDefault,
        cursor: 'pointer',
        transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
        '&:hover': {
          borderColor: colors.border.hover,
          background: colors.background.cardHover,
          boxShadow: shadows.cardHover,
          transform: 'translateY(-2px)',
        },
      },
    }

    return (
      <div
        ref={ref}
        style={{
          borderRadius: '20px',
          padding: spacing['8'],
          ...variantStyles[variant],
        }}
        className={className}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// ============================================================================
// TEXT COMPONENTS
// ============================================================================

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
}

/**
 * Semantic Heading Component with typography scale
 */
export const Heading = ({ level = 1, children, className = '' }: HeadingProps) => {
  const typographyMap = {
    1: typography.heading.xl,
    2: typography.heading.lg,
    3: typography.heading.md,
    4: typography.heading.sm,
    5: typography.heading.xs,
    6: typography.heading.xs,
  }

  const Tag = `h${level}` as keyof JSX.IntrinsicElements

  return React.createElement(Tag as any, {
    style: {
      ...typographyMap[level],
      color: colors.text.primary,
      margin: 0,
    },
    className,
    children,
  })
}

interface TextProps {
  variant?: 'body-lg' | 'body-md' | 'body-sm' | 'caption' | 'code'
  children: React.ReactNode
  className?: string
}

/**
 * Flexible Text Component
 */
export const Text = ({ variant = 'body-lg', children, className = '' }: TextProps) => {
  const variantStyles = {
    'body-lg': {
      ...typography.body.lg,
      color: colors.text.primary,
    },
    'body-md': {
      ...typography.body.md,
      color: colors.text.secondary,
    },
    'body-sm': {
      ...typography.body.sm,
      color: colors.text.tertiary,
    },
    'caption': {
      ...typography.label.md,
      color: colors.text.muted,
    },
    'code': {
      ...typography.code.md,
      background: colors.surface.level1,
      padding: `${spacing['1']} ${spacing['2']}`,
      borderRadius: '4px',
    },
  }

  return (
    <span style={variantStyles[variant]} className={className}>
      {children}
    </span>
  )
}

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

/**
 * Form Input Component with validation states
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2'] }}>
        {label && (
          <label
            style={{
              ...typography.label.md,
              color: error ? colors.semantic.error.main : colors.text.primary,
              fontWeight: '600',
            }}
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          style={{
            ...typography.body.md,
            background: colors.surface.level1,
            color: colors.text.primary,
            border: `1px solid ${
              error
                ? colors.semantic.error.main
                : isFocused
                  ? colors.border.focus
                  : colors.border.default
            }`,
            borderRadius: '12px',
            padding: `${spacing['3']} ${spacing['4']}`,
            transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
            boxShadow: isFocused ? `0 0 0 3px rgba(79, 110, 247, 0.1)` : 'none',
            fontSize: '15px',
            outlineColor: 'transparent',
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={className}
          {...props}
        />

        {error && (
          <Text variant="caption" style={{ color: colors.semantic.error.main }}>
            {error}
          </Text>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ============================================================================
// BADGE COMPONENT
// ============================================================================

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

/**
 * Badge Component with semantic variants
 */
export const Badge = ({ children, variant = 'default', size = 'sm' }: BadgeProps) => {
  const variantStyles = {
    default: {
      background: colors.surface.level2,
      color: colors.text.primary,
      border: `1px solid ${colors.border.default}`,
    },
    success: {
      background: colors.semantic.success.main,
      color: '#FFFFFF',
    },
    warning: {
      background: colors.semantic.warning.main,
      color: '#000000',
    },
    error: {
      background: colors.semantic.error.main,
      color: '#FFFFFF',
    },
    info: {
      background: colors.semantic.info.main,
      color: '#FFFFFF',
    },
  }

  const sizeStyles = {
    sm: {
      ...typography.label.sm,
      padding: `${spacing['1']} ${spacing['2']}`,
    },
    md: {
      ...typography.label.md,
      padding: `${spacing['2']} ${spacing['3']}`,
    },
  }

  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: '9999px',
        fontWeight: '600',
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  )
}

// ============================================================================
// ALERT COMPONENT
// ============================================================================

interface AlertProps {
  title: string
  message: string
  type?: 'success' | 'warning' | 'error' | 'info'
  onClose?: () => void
}

/**
 * Alert Component with semantic styling
 */
export const Alert = ({ title, message, type = 'info', onClose }: AlertProps) => {
  const semanticColor = colors.semantic[type]

  return (
    <div
      style={{
        background: semanticColor.light,
        border: `1px solid ${semanticColor.main}`,
        borderRadius: '12px',
        padding: spacing['4'],
        display: 'flex',
        gap: spacing['3'],
        alignItems: 'flex-start',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            ...typography.label.md,
            color: semanticColor.darkest,
            fontWeight: '600',
            marginBottom: spacing['1'],
          }}
        >
          {title}
        </div>
        <div
          style={{
            ...typography.body.sm,
            color: semanticColor.dark,
          }}
        >
          {message}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: semanticColor.dark,
            cursor: 'pointer',
            padding: spacing['1'],
            fontSize: '20px',
            lineHeight: '1',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ============================================================================
// GRADIENT TEXT COMPONENT
// ============================================================================

interface GradientTextProps {
  children: React.ReactNode
  variant?: 'accent' | 'blueToViolet' | 'violetToCyan'
  className?: string
}

/**
 * Gradient Text Component for hero sections
 */
export const GradientText = ({
  children,
  variant = 'accent',
  className = '',
}: GradientTextProps) => {
  const gradientMap = {
    accent: gradients.accent,
    blueToViolet: gradients.blueToViolet,
    violetToCyan: gradients.violetToCyan,
  }

  return (
    <span
      style={{
        backgroundImage: gradientMap[variant],
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
      className={className}
    >
      {children}
    </span>
  )
}

// ============================================================================
// EXAMPLE COMPONENT SHOWCASES
// ============================================================================

/**
 * Hero Section Example
 */
export const HeroSection = () => {
  return (
    <div
      style={{
        background: gradients.hero,
        padding: `${spacing['20']} ${spacing['8']}`,
        borderRadius: '24px',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          ...typography.display.xl,
          color: colors.text.primary,
          marginBottom: spacing['4'],
        }}
      >
        Welcome to <GradientText>VoiceAgent OS</GradientText>
      </h1>

      <p
        style={{
          ...typography.body.lg,
          color: colors.text.secondary,
          maxWidth: '600px',
          margin: `0 auto ${spacing['8']}`,
        }}
      >
        Experience the future of voice-powered artificial intelligence with our premium platform.
      </p>

      <div style={{ display: 'flex', gap: spacing['4'], justifyContent: 'center' }}>
        <Button variant="primary">Get Started</Button>
        <Button variant="secondary">Learn More</Button>
      </div>
    </div>
  )
}

/**
 * Feature Card Grid Example
 */
export const FeatureCardGrid = () => {
  const features = [
    { title: 'Fast', description: 'Lightning-quick response times' },
    { title: 'Secure', description: 'Enterprise-grade security' },
    { title: 'Scalable', description: 'Built for growth' },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: spacing['6'],
        padding: spacing['8'],
      }}
    >
      {features.map((feature) => (
        <Card key={feature.title} variant="interactive">
          <h3
            style={{
              ...typography.heading.sm,
              color: colors.text.primary,
              marginBottom: spacing['3'],
            }}
          >
            {feature.title}
          </h3>
          <p
            style={{
              ...typography.body.md,
              color: colors.text.secondary,
            }}
          >
            {feature.description}
          </p>
        </Card>
      ))}
    </div>
  )
}

/**
 * Form Example
 */
export const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  return (
    <form
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: spacing['6'],
      }}
    >
      <Input
        label="Name"
        placeholder="Your name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <Input
        label="Email"
        type="email"
        placeholder="your@email.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2'] }}>
        <label
          style={{
            ...typography.label.md,
            color: colors.text.primary,
            fontWeight: '600',
          }}
        >
          Message
        </label>
        <textarea
          placeholder="Your message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          style={{
            ...typography.body.md,
            background: colors.surface.level1,
            color: colors.text.primary,
            border: `1px solid ${colors.border.default}`,
            borderRadius: '12px',
            padding: spacing['4'],
            minHeight: '120px',
            fontFamily: 'inherit',
            resize: 'vertical',
            transition: `all ${motion.duration.base} ${motion.easing.smooth}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.border.focus
            e.currentTarget.style.boxShadow = `0 0 0 3px rgba(79, 110, 247, 0.1)`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border.default
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      <Button variant="primary" size="lg">
        Send Message
      </Button>
    </form>
  )
}

export default {
  Button,
  Card,
  Heading,
  Text,
  Input,
  Badge,
  Alert,
  GradientText,
  HeroSection,
  FeatureCardGrid,
  ContactForm,
}
