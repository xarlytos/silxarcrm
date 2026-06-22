import { Request, Response, NextFunction } from 'express';
import { createHmac } from 'crypto';
import { RateLimiter } from 'limiter';

// ============================================================================
// 1. HTTPS/TLS 1.3 Enforcement
// ============================================================================

export const enforceTLS = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Redirect HTTP to HTTPS
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
    return;
  }

  // Set Strict-Transport-Security for TLS enforcement
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  next();
};

// ============================================================================
// 2. Security Headers Middleware
// ============================================================================

export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // HSTS - HTTP Strict Transport Security
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // X-Frame-Options - Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options - Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Content-Security-Policy - Strict CSP
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'nonce-${nonce}'; " +
    "style-src 'self' 'nonce-${nonce}'; " +
    "img-src 'self' https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "form-action 'self'; " +
    "base-uri 'self'; " +
    "upgrade-insecure-requests"
  );

  // X-XSS-Protection - Legacy XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  next();
};

// ============================================================================
// 3. Rate Limiting (100 req/min per IP)
// ============================================================================

const rateLimiters = new Map<string, RateLimiter>();
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export const rateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = getClientIP(req);

  if (!rateLimiters.has(ip)) {
    const limiter = new RateLimiter({
      tokensPerInterval: RATE_LIMIT_MAX_REQUESTS,
      interval: RATE_LIMIT_WINDOW_MS,
    });
    rateLimiters.set(ip, limiter);
  }

  const limiter = rateLimiters.get(ip)!;

  limiter.removeTokens(1, (err, remainingRequests) => {
    if (err) {
      return res.status(500).json({ error: 'Rate limit check failed' });
    }

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remainingRequests));

    if (remainingRequests < 0) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: 60,
      });
    }

    next();
  });
};

// Helper to extract client IP
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.socket.remoteAddress as string) ||
    'unknown'
  );
};

// ============================================================================
// 4. AWS SigV4 Request Signing Verification
// ============================================================================

export interface SigV4Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
}

export const verifyAWSSigV4 = (config: SigV4Config) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('AWS4-HMAC-SHA256')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    try {
      const signature = extractSignature(authHeader);
      const canonicalRequest = buildCanonicalRequest(req, config);
      const stringToSign = buildStringToSign(canonicalRequest);
      const expectedSignature = calculateSignature(
        stringToSign,
        config.secretAccessKey,
        req.headers['x-amz-date'] as string
      );

      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Verify timestamp is not older than 15 minutes
      const requestTime = new Date(req.headers['x-amz-date'] as string);
      const now = new Date();
      const timeDiff = (now.getTime() - requestTime.getTime()) / 1000;

      if (timeDiff > 900) {
        return res.status(401).json({ error: 'Request timestamp too old' });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Signature verification failed' });
    }
  };
};

const extractSignature = (authHeader: string): string => {
  const match = authHeader.match(/Signature=([a-f0-9]+)/);
  return match ? match[1] : '';
};

const buildCanonicalRequest = (req: Request, config: SigV4Config): string => {
  const method = req.method;
  const path = req.path;
  const query = req.url.split('?')[1] || '';
  const host = req.headers.host || '';
  const date = (req.headers['x-amz-date'] as string) || '';

  let headers = `host:${host}\nx-amz-date:${date}\n`;
  const signedHeaders = 'host;x-amz-date';

  let payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA256 of empty string
  if (req.body) {
    payloadHash = createHmac('sha256', '')
      .update(JSON.stringify(req.body))
      .digest('hex');
  }

  return `${method}\n${path}\n${query}\n${headers}\n${signedHeaders}\n${payloadHash}`;
};

const buildStringToSign = (canonicalRequest: string): string => {
  const date = new Date().toISOString().split('T')[0];
  const requestHash = createHmac('sha256', '')
    .update(canonicalRequest)
    .digest('hex');

  return `AWS4-HMAC-SHA256\n${new Date().toISOString()}\n${date}/us-east-1/service/aws4_request\n${requestHash}`;
};

const calculateSignature = (
  stringToSign: string,
  secretAccessKey: string,
  amzDate: string
): string => {
  const date = amzDate.split('T')[0];
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(date).digest();
  const kRegion = createHmac('sha256', kDate).update('us-east-1').digest();
  const kService = createHmac('sha256', kRegion).update('service').digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();

  return createHmac('sha256', kSigning).update(stringToSign).digest('hex');
};

// ============================================================================
// 5. GDPR Data Export Endpoint
// ============================================================================

export interface GDPRDataExportHandler {
  getUserData: (userId: string) => Promise<Record<string, unknown>>;
}

export const gdprDataExportEndpoint = (handler: GDPRDataExportHandler) => {
  return async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const authenticatedUserId = (req as any).user?.id;

    if (!authenticatedUserId || authenticatedUserId !== userId) {
      res.status(403).json({ error: 'Unauthorized access to user data' });
      return;
    }

    try {
      const userData = await handler.getUserData(userId);

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId,
        data: userData,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="gdpr-export-${userId}-${Date.now()}.json"`
      );

      res.status(200).json(exportData);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to export user data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

// ============================================================================
// 6. GDPR Data Deletion Endpoint
// ============================================================================

export interface GDPRDataDeletionHandler {
  deleteUserData: (userId: string) => Promise<boolean>;
}

export const gdprDataDeletionEndpoint = (handler: GDPRDataDeletionHandler) => {
  return async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const authenticatedUserId = (req as any).user?.id;

    if (!authenticatedUserId || authenticatedUserId !== userId) {
      res.status(403).json({ error: 'Unauthorized access' });
      return;
    }

    try {
      const deleted = await handler.deleteUserData(userId);

      if (!deleted) {
        res.status(404).json({ error: 'User data not found' });
        return;
      }

      res.status(200).json({
        message: 'User data successfully deleted',
        userId,
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to delete user data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

// ============================================================================
// 7. Combined Security Middleware Stack
// ============================================================================

export const setupSecurityMiddleware = (
  app: any,
  sigV4Config?: SigV4Config,
  gdprHandlers?: {
    exportHandler: GDPRDataExportHandler;
    deletionHandler: GDPRDataDeletionHandler;
  }
): void => {
  // Apply security headers first
  app.use(securityHeaders);

  // Enforce HTTPS/TLS
  app.use(enforceTLS);

  // Apply rate limiting
  app.use(rateLimitMiddleware);

  // Apply SigV4 verification if config provided
  if (sigV4Config) {
    app.use('/api/v1/signed', verifyAWSSigV4(sigV4Config));
  }

  // Setup GDPR endpoints if handlers provided
  if (gdprHandlers) {
    app.get(
      '/api/v1/gdpr/export/:userId',
      gdprDataExportEndpoint(gdprHandlers.exportHandler)
    );

    app.delete(
      '/api/v1/gdpr/delete/:userId',
      gdprDataDeletionEndpoint(gdprHandlers.deletionHandler)
    );
  }
};

// ============================================================================
// 8. CSP Nonce Generator
// ============================================================================

export const generateCSPNonce = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let nonce = '';
  const array = new Uint8Array(32);

  if (typeof window !== 'undefined') {
    window.crypto.getRandomValues(array);
  } else {
    const crypto = require('crypto');
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < array.length; i++) {
    nonce += characters.charAt(array[i] % characters.length);
  }

  return nonce;
};

// ============================================================================
// 9. Input Validation & Sanitization
// ============================================================================

export const validateInput = (schema: Record<string, any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      for (const [field, rules] of Object.entries(schema)) {
        const value = req.body[field];

        if (rules.required && !value) {
          return res.status(400).json({
            error: `Field '${field}' is required`,
          });
        }

        if (rules.type && value && typeof value !== rules.type) {
          return res.status(400).json({
            error: `Field '${field}' must be of type ${rules.type}`,
          });
        }

        if (rules.maxLength && value?.length > rules.maxLength) {
          return res.status(400).json({
            error: `Field '${field}' exceeds max length of ${rules.maxLength}`,
          });
        }

        if (rules.pattern && value && !rules.pattern.test(value)) {
          return res.status(400).json({
            error: `Field '${field}' format is invalid`,
          });
        }
      }

      next();
    } catch (error) {
      res.status(400).json({ error: 'Input validation failed' });
    }
  };
};

export default {
  enforceTLS,
  securityHeaders,
  rateLimitMiddleware,
  verifyAWSSigV4,
  gdprDataExportEndpoint,
  gdprDataDeletionEndpoint,
  setupSecurityMiddleware,
  generateCSPNonce,
  validateInput,
};
