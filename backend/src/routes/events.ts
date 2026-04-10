import { Router, Request, Response } from 'express';
import { trackEvent, validateApiKey, TrackingEvent } from '../services/trackingService';
import { logger } from '../utils/logger';

const router = Router();

// Middleware para extraer API Key
function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return req.headers['x-api-key'] as string || null;
}

// POST /events - Recibir eventos de tracking
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. Validar API Key
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key required. Use Authorization: Bearer <key> or X-API-Key header'
      });
      return;
    }

    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({ success: false, error: validation.error });
      return;
    }

    // 2. Validar payload
    const event: TrackingEvent = req.body;

    if (!event.event || typeof event.event !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Event name is required (field: "event")'
      });
      return;
    }

    if (!event.data || typeof event.data !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Event data is required (field: "data")'
      });
      return;
    }

    // 3. Track event
    const result = await trackEvent(
      event,
      validation.crmId!,
      {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // 4. Responder rápido (202 Accepted)
    res.status(202).json({
      success: true,
      eventId: result.eventId,
      message: 'Event accepted for processing',
    });

  } catch (error) {
    logger.error('Error processing tracking event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /events/batch - Recibir múltiples eventos
router.post('/batch', async (req: Request, res: Response) => {
  try {
    // 1. Validar API Key
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key required'
      });
      return;
    }

    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
      res.status(401).json({ success: false, error: validation.error });
      return;
    }

    // 2. Validar payload
    const { events }: { events: TrackingEvent[] } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Events array is required'
      });
      return;
    }

    if (events.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Maximum 100 events per batch'
      });
      return;
    }

    // 3. Track events
    const results = await Promise.all(
      events.map(event =>
        trackEvent(event, validation.crmId!, {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        })
      )
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    res.status(202).json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        index: i,
        success: r.success,
        eventId: r.eventId,
        error: r.error,
      })),
    });

  } catch (error) {
    logger.error('Error processing batch events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /events/health - Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'tracking',
    timestamp: new Date().toISOString(),
  });
});

export default router;
