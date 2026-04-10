import { Request, Response, NextFunction } from 'express';
import { validateSignature } from '../utils/crypto';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';

export async function webhookValidator(req: Request, res: Response, next: NextFunction): Promise<void> {
  const saasName = req.params.saas_name;
  const signature = req.headers['x-webhook-signature'] as string;
  const webhookId = req.headers['x-webhook-id'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;

  // Validate required headers
  if (!signature || !webhookId || !timestamp) {
    res.status(400).json({ error: 'Headers requeridos faltantes', details: 'X-Webhook-Signature, X-Webhook-Id, X-Webhook-Timestamp son obligatorios' });
    return;
  }

  // Check timestamp freshness (5 min window)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Math.abs(now - ts) > 300) {
    res.status(401).json({ error: 'Timestamp expirado' });
    return;
  }

  // Get webhook config
  const config = await prisma.webhookConfig.findUnique({ where: { saas: saasName } });
  if (!config) {
    res.status(404).json({ error: 'SaaS no configurado', saas: saasName });
    return;
  }

  if (!config.activo) {
    res.status(404).json({ error: 'Webhook desactivado para este SaaS' });
    return;
  }

  // Validate HMAC signature
  const rawBody = JSON.stringify(req.body);
  if (!validateSignature(signature, rawBody, config.webhookSecret)) {
    logger.warn(`Invalid webhook signature for SaaS: ${saasName}`);
    res.status(401).json({ error: 'Firma inválida' });
    return;
  }

  // Idempotency check
  const idempotencyKey = `webhook:${webhookId}`;
  const alreadyProcessed = await cache.get(idempotencyKey);
  if (alreadyProcessed) {
    res.status(200).json({ success: true, status: 'already_processed', timestamp: alreadyProcessed });
    return;
  }

  // Mark as being processed (24h TTL)
  await cache.set(idempotencyKey, new Date().toISOString(), 'EX', 86400);

  // Rate limiting per SaaS
  const rateLimitKey = `ratelimit:webhook:${saasName}`;
  const currentCount = await cache.incr(rateLimitKey);
  if (currentCount === 1) {
    await cache.expire(rateLimitKey, 60);
  }
  if (currentCount > 100) {
    res.status(429).json({ error: 'Rate limit excedido', max: '100 webhooks/minuto' });
    return;
  }

  next();
}
