/**
 * TLS/HTTPS Integration Helper
 * Complete setup guide and configuration check
 */

import { Express, Request, Response } from 'express';
import {
  tlsHardeningStack,
  createAdvancedRateLimiter,
  createAuthRateLimiter,
} from './tlsHardening';

/**
 * Complete TLS Hardening Setup for Express
 * Apply this to your Express app in one call
 *
 * @param app - Express application
 * @param options - Configuration options
 * @returns Setup confirmation
 */
export function setupTLSHardening(
  app: Express,
  options?: {
    enableAuthLimiter?: boolean;
    redisClient?: any;
    customSkipPaths?: string[];
    tlsEnabled?: boolean;
  }
) {
  const {
    enableAuthLimiter = true,
    redisClient,
    tlsEnabled = process.env.TLS_ENABLED === 'true',
  } = options || {};

  const setup: {
    tlsEnabled: boolean;
    middleware: string[];
    rateLimitStore: string;
    status: 'success' | 'warning' | 'error';
    message: string;
  } = {
    tlsEnabled,
    middleware: [],
    rateLimitStore: redisClient ? 'Redis' : 'Memory',
    status: 'success',
    message: '',
  };

  try {
    // 1. Apply TLS hardening stack (HSTS, Security Headers, CSP)
    app.use(...tlsHardeningStack);
    setup.middleware.push('TLS Hardening Stack (HSTS + Security Headers + CSP)');

    // 2. Apply general rate limiting (100 req/min)
    app.use('/api', createAdvancedRateLimiter(redisClient));
    setup.middleware.push('General API Rate Limiting (100 req/min)');

    // 3. Apply auth rate limiting if enabled (10 req/15min)
    if (enableAuthLimiter) {
      app.use('/api/auth', createAuthRateLimiter(redisClient));
      setup.middleware.push('Auth Endpoint Rate Limiting (10 req/15min)');
    }

    // 4. Add diagnostic endpoint
    app.get('/api/security/info', (_req: Request, res: Response) => {
      res.json({
        tls: {
          enabled: tlsEnabled,
          version: '1.3',
          hsts: {
            enabled: true,
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
          rateLimiting: {
            enabled: true,
            general: '100 req/min per IP',
            auth: enableAuthLimiter ? '10 req/15min per IP' : 'disabled',
            store: setup.rateLimitStore,
          },
          headers: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
            'Content-Security-Policy': 'See response headers',
          },
        },
        middleware: setup.middleware,
        timestamp: new Date().toISOString(),
      });
    });
    setup.middleware.push('Diagnostic endpoint (/api/security/info)');

    setup.message = `✓ TLS Hardening enabled with ${setup.middleware.length} middleware`;

    if (!tlsEnabled) {
      setup.status = 'warning';
      setup.message += '\n⚠ Warning: TLS_ENABLED=false. Ensure Nginx is configured with TLS 1.3.';
    }

    if (!redisClient) {
      setup.status = 'warning';
      setup.message += '\n⚠ Warning: Using memory store for rate limiting. Use Redis for production.';
    }

    return setup;
  } catch (error) {
    setup.status = 'error';
    setup.message = `Failed to setup TLS hardening: ${error instanceof Error ? error.message : 'Unknown error'}`;
    throw error;
  }
}

/**
 * TLS Configuration Validator
 * Checks environment and runtime configuration
 */
export function validateTLSConfiguration() {
  const checks = {
    environment: {
      tlsEnabled: process.env.TLS_ENABLED === 'true',
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
    },
    recommendations: [] as string[],
    errors: [] as string[],
    warnings: [] as string[],
  };

  // Check environment
  if (!process.env.TLS_ENABLED) {
    checks.warnings.push('TLS_ENABLED not set. Defaulting to false.');
    checks.recommendations.push('Set TLS_ENABLED=true when deployed with Nginx/TLS');
  }

  if (process.env.NODE_ENV !== 'production') {
    checks.warnings.push(`NODE_ENV=${process.env.NODE_ENV}. Use production in prod!`);
  }

  if (!process.env.JWT_SECRET) {
    checks.errors.push('JWT_SECRET not configured');
  }

  if (!process.env.DATABASE_URL) {
    checks.errors.push('DATABASE_URL not configured');
  }

  // Recommendations for production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.REDIS_URL) {
      checks.recommendations.push('Configure Redis (REDIS_URL) for distributed rate limiting');
    }
  }

  return checks;
}

/**
 * Print TLS Configuration Summary
 * Use in startup logs
 */
export function printTLSConfigurationSummary(
  setup: ReturnType<typeof setupTLSHardening>
) {
  console.log('\n' + '='.repeat(60));
  console.log('TLS/HTTPS HARDENING CONFIGURATION');
  console.log('='.repeat(60));
  console.log(`\nStatus: ${setup.status.toUpperCase()}`);
  console.log(`Message: ${setup.message}\n`);

  console.log('Enabled Middleware:');
  setup.middleware.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m}`);
  });

  console.log(`\nRate Limiting Store: ${setup.rateLimitStore}`);
  console.log(`TLS Enabled: ${setup.tlsEnabled ? 'Yes' : 'No (requires Nginx)'}`);

  console.log('\nRequired External Configuration:');
  console.log('  - Nginx with TLS 1.3 (see nginx.conf)');
  console.log('  - SSL certificate (Let\'s Encrypt recommended)');
  console.log('  - Firewall rules for ports 80 (HTTP) and 443 (HTTPS)');

  console.log('\nTest Commands:');
  console.log('  curl -i --tlsv1.3 https://api.domain.com/health');
  console.log('  curl -i https://api.domain.com/api/security/info');
  console.log(`  for i in {{1..105}}; do curl -s https://api.domain.com/api/test -w "%{http_code}\\n"; done`);

  console.log('\nDocumentation:');
  console.log('  - /TLS-HARDENING-IMPLEMENTATION.md - Complete guide');
  console.log('  - /nginx.conf - Nginx configuration');
  console.log('  - /backend/src/middleware/tlsHardening.ts - Middleware source');

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Export all TLS utilities
 */
export default {
  setupTLSHardening,
  validateTLSConfiguration,
  printTLSConfigurationSummary,
};
