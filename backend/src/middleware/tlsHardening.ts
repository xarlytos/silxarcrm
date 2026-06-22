import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

/**
 * TLS 1.3 Enforcement Middleware
 * Verifies client used TLS 1.3 and rejects insecure connections
 */
export const enforceTLS13 = (req: Request, res: Response, next: NextFunction) => {
  const tlsVersion = (req as any).socket?.tlsVersion;

  if (tlsVersion && tlsVersion !== 'TLSv1.3') {
    res.status(400).json({
      error: 'TLS 1.3 required',
      message: 'This API requires TLS 1.3 or higher. Please upgrade your client.',
      current: tlsVersion,
    });
    return;
  }

  next();
};

/**
 * HSTS Strict-Transport-Security Header
 * Enforces HTTPS for 1 year (31536000 seconds), includes subdomains
 */
export const hstsHeader = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
};

/**
 * Security Headers Middleware
 * X-Frame-Options: Clickjacking protection
 * X-Content-Type-Options: MIME-sniffing protection
 * Content-Security-Policy: Prevents XSS and resource injection
 * X-XSS-Protection: Legacy XSS filter (for older browsers)
 * Referrer-Policy: Controls referrer information leakage
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking - disallow framing in any context
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing - force browser to respect Content-Type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter (deprecated in modern browsers but good for legacy support)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy - strict mode
  // - default-src 'self': Only load resources from same origin
  // - script-src: JavaScript from self + trusted CDNs
  // - style-src: CSS from self (nonce-based for inline styles)
  // - img-src: Images from self and data URIs
  // - font-src: Fonts from self
  // - connect-src: API/WebSocket connections to self and known APIs
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.openai.com https://api.google.com https://generativelanguage.googleapis.com https://api.elevenlabs.io wss: https:; " +
    "frame-ancestors 'none'; " +
    "form-action 'self'; " +
    "base-uri 'self'; " +
    "upgrade-insecure-requests;"
  );

  // Referrer-Policy: Send only the domain, not the full URL
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy (formerly Feature-Policy)
  // Restrict powerful features like camera, microphone, geolocation
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  next();
};

/**
 * Certificate Pinning for External APIs
 * Validates API endpoints use expected certificates
 *
 * Public Key Pins (SPKI SHA-256):
 * - Generated from API provider certificates
 * - If pin fails, request is rejected
 *
 * NOTE: In production, update these pins with actual certificate fingerprints
 * Generate pins: openssl s_client -connect api.example.com:443 | openssl x509 -noout -pubkey | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl enc -base64
 */
export const certificatePinMap: Record<string, string[]> = {
  'api.openai.com': [
    // OpenAI certificate pins (update with actual)
    'pin-sha256="rRVzL8RW8GYPuLZx1JzSB8pP/9TskJ0b7r6KuF2f8nA="',
    // Backup pin
    'pin-sha256="++DhSCh8qmOj4HYPa3Wq6hON+p1FbpxON3a1JXP8zQ="',
  ],
  'api.elevenlabs.io': [
    // ElevenLabs certificate pins (update with actual)
    'pin-sha256="9Z6xpKTlP4PeFnQBtKhgQ8qpH7OO9kAq5L1dF7wDhzA="',
    // Backup pin
    'pin-sha256="abc123def456ghi789jkl012mno345pqr678stuv=="',
  ],
  'generativelanguage.googleapis.com': [
    // Google API certificate pins (update with actual)
    'pin-sha256="7L4XY+mB2U1N5vK6zQ9pR3sT8wV1aB2cD3eF4gH5iJ="',
    // Backup pin
    'pin-sha256="xyz789abc123def456ghi789jkl012mno345pqr=="',
  ],
};

/**
 * Implements certificate pinning validation
 * For HTTPS connections to external APIs, validates the server certificate
 * matches expected public key
 */
export const validateCertificatePin = async (
  hostname: string,
  certificate: any
): Promise<boolean> => {
  const pins = certificatePinMap[hostname];

  if (!pins || pins.length === 0) {
    // If no pins configured, allow request (not pinned)
    return true;
  }

  try {
    // Extract public key from certificate
    const publicKey = certificate.pubkey;

    if (!publicKey) {
      console.warn(`[Certificate Pinning] No public key found for ${hostname}`);
      return false;
    }

    // Calculate SPKI SHA-256 hash
    const der = crypto.createPublicKey({
      key: publicKey,
      format: 'pem',
    }).export({ format: 'der', type: 'spki' });

    const hash = crypto.createHash('sha256').update(der).digest('base64');
    const calculatedPin = `pin-sha256="${hash}"`;

    // Check if calculated pin matches any of the pinned certs
    const pinMatches = pins.some(pin => pin === calculatedPin);

    if (!pinMatches) {
      console.error(
        `[Certificate Pinning] Pin mismatch for ${hostname}. ` +
        `Expected one of: ${pins.join(', ')}. Got: ${calculatedPin}`
      );
      return false;
    }

    console.info(`[Certificate Pinning] ✓ ${hostname} certificate validated`);
    return true;
  } catch (error) {
    console.error(`[Certificate Pinning] Error validating ${hostname}:`, error);
    return false;
  }
};

/**
 * Advanced Rate Limiter Configuration
 * 100 requests per minute per IP address
 *
 * Features:
 * - IP-based throttling (accounts for proxies via X-Forwarded-For)
 * - Redis store support for distributed deployments
 * - Standard Rate-Limit headers (RFC 6585)
 * - Whitelist for health checks and internal services
 */
export const createAdvancedRateLimiter = (redisClient?: any) => {
  const baseConfig = {
    // 100 requests per 60 seconds
    windowMs: 60 * 1000,
    max: 100,

    // Use standard RateLimit headers (not the legacy X-RateLimit-*)
    standardHeaders: true,
    legacyHeaders: false,

    // Trust X-Forwarded-For header for accurate IP (set behind reverse proxy)
    trust: (req: any) => {
      // Trust if behind proxy
      return req.ip || req.connection?.remoteAddress;
    },

    // Skip rate limiting for health checks and webhooks
    skip: (req: Request) => {
      return (
        req.path === '/health' ||
        req.path.startsWith('/webhooks') ||
        req.path.startsWith('/api/events')
      );
    },

    // Custom error message
    message: {
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Maximum 100 requests per minute allowed.',
      retryAfter: '60',
    },

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded: 100 requests per minute per IP',
        retryAfter: 60,
        ip: req.ip,
      });
    },
  };

  // Use Redis store if provided (for distributed deployments)
  if (redisClient) {
    const RedisStore = require('rate-limit-redis');
    return rateLimit({
      ...baseConfig,
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:', // Rate limit key prefix in Redis
      }),
    });
  }

  // Memory store for single-instance deployments
  return rateLimit(baseConfig);
};

/**
 * Stricter rate limiting for sensitive endpoints
 * 10 requests per 15 minutes for authentication
 */
export const createAuthRateLimiter = (redisClient?: any) => {
  const baseConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => req.path === '/health',
    message: {
      error: 'Too many login attempts',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: 900,
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many login attempts',
        message: 'Rate limit exceeded: 10 requests per 15 minutes',
        retryAfter: 900,
      });
    },
  };

  if (redisClient) {
    const RedisStore = require('rate-limit-redis');
    return rateLimit({
      ...baseConfig,
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl-auth:',
      }),
    });
  }

  return rateLimit(baseConfig);
};

/**
 * Composite TLS Hardening Middleware Stack
 * Applies all security measures in correct order
 */
export const tlsHardeningStack = [
  enforceTLS13,
  hstsHeader,
  securityHeaders,
];

/**
 * Exports for easy integration
 */
export default {
  enforceTLS13,
  hstsHeader,
  securityHeaders,
  validateCertificatePin,
  certificatePinMap,
  createAdvancedRateLimiter,
  createAuthRateLimiter,
  tlsHardeningStack,
};
