/**
 * Application Routes Configuration
 * Centralized routing for all buttons and navigation
 */

export const ROUTES = {
  // Main sections (scroll anchors)
  HOME: '/',
  HERO: '#hero',
  PROBLEM: '#problem',
  SOLUTION: '#solution',
  FEATURES: '#features',
  BENEFITS: '#benefits',
  ROI: '#pricing',
  COMPARISON: '#comparison',
  TESTIMONIALS: '#testimonials',
  FAQ: '#faq',
  CTA: '#cta',

  // Pages
  CASE_STUDIES: '/case-studies',
  CONTACT: '/contact',
  PRICING: '/pricing',
  INTEGRATIONS: '/integrations',
  DOCUMENTATION: '/docs',
  BLOG: '/blog',

  // Agent pages
  SDR_AGENT: '/agents/sdr',
  CLOSER_AGENT: '/agents/closer',
  FOLLOWUP_AGENT: '/agents/followup',

  // External actions
  PRICING: '/#pricing',
  DEMO: '/demo',
  SIGNUP: '/signup',

  // Social
  TWITTER: 'https://twitter.com/voiceagentai',
  LINKEDIN: 'https://linkedin.com/company/voiceagentai',
  GITHUB: 'https://github.com/voiceagentai',

  // Legal
  PRIVACY: '/privacy',
  TERMS: '/terms',
  COOKIES: '/cookies',
} as const

// Button action handlers
export const BUTTON_ACTIONS = {
  startTrial: () => {
    // Scroll to pricing section
    const pricingSection = document.getElementById('pricing')
    pricingSection?.scrollIntoView({ behavior: 'smooth' })
  },

  viewDemo: () => {
    // Open demo video in new tab
    window.open('https://www.youtube.com/embed/dQw4w9WgXcQ', '_blank')
  },

  talkToExpert: () => {
    // Redirect to contact page
    window.location.href = ROUTES.CONTACT
  },

  viewCaseStudies: () => {
    // Redirect to case studies page
    window.location.href = ROUTES.CASE_STUDIES
  },

  scrollToSection: (sectionId: string) => {
    const section = document.getElementById(sectionId)
    section?.scrollIntoView({ behavior: 'smooth' })
  },
} as const

export type Route = typeof ROUTES[keyof typeof ROUTES]
export type ButtonAction = typeof BUTTON_ACTIONS[keyof typeof BUTTON_ACTIONS]
