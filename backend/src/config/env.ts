import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_URL: process.env.API_URL || 'http://localhost:5000',

  DATABASE_URL: process.env.DATABASE_URL!,

  REDIS_URL: process.env.REDIS_URL || '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',

  ZADARMA_USER_KEY: process.env.ZADARMA_USER_KEY || '',
  ZADARMA_SECRET_KEY: process.env.ZADARMA_SECRET_KEY || '',
  ZADARMA_NUMBER_DID: process.env.ZADARMA_NUMBER_DID || '',
  ZADARMA_DEFAULT_AGENT_PHONE: process.env.ZADARMA_DEFAULT_AGENT_PHONE || '',

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT || '',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET || '',
  EMAIL_UNSUBSCRIBE_SECRET: process.env.EMAIL_UNSUBSCRIBE_SECRET || 'unsubscribe-secret-placeholder-change-me',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  MOBILE_APP_SCHEME: process.env.MOBILE_APP_SCHEME || 'crm-maestro',

  FCM_ENABLED: process.env.FCM_ENABLED === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  AI_AGENT_URL: process.env.AI_AGENT_URL || 'http://localhost:8000',
  AI_AGENT_SECRET: process.env.AI_AGENT_SECRET || '',

  // Generación de imágenes (logos/diseños de ropa)
  OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',

  // Print-on-demand (marcas de ropa automáticas)
  PRINTIFY_API_KEY: process.env.PRINTIFY_API_KEY || '',
  PRINTIFY_SHOP_ID: process.env.PRINTIFY_SHOP_ID || '',

  // Stripe (cobro tienda de ropa)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Dominio público del sitio AdSense / tienda
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
} as const;
