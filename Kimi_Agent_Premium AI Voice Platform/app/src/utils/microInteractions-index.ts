/**
 * Micro-Interactions Export Index
 *
 * Centralized import point for all micro-interaction utilities
 * Use this for cleaner imports throughout your application
 */

// Core animations
export * from './microInteractions'

// Advanced animations
export * from './microInteractions-advanced'

// Pre-built components
export {
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

/**
 * USAGE EXAMPLES
 *
 * Instead of:
 *   import * as micro from '@/utils/microInteractions'
 *   import { RippleButton } from '@/components/ui/microInteraction-examples'
 *
 * Use:
 *   import * as micro from '@/utils/microInteractions-index'
 *   // Everything is available
 *
 * OR:
 *   import { RippleButton, buttonHoverVariants } from '@/utils/microInteractions-index'
 */
