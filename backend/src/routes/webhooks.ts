import { Router, Request, Response } from 'express';
import { webhookValidator } from '../middleware/webhookValidator';
import { processWebhookEvent } from '../services/webhookProcessor';
import { logger } from '../utils/logger';
import { WebhookPayload } from '../types/webhook';

const router = Router();

router.post('/:saas_name', webhookValidator, async (req: Request, res: Response) => {
  try {
    const payload = req.body as WebhookPayload;
    const result = await processWebhookEvent(payload);

    res.status(200).json({
      success: true,
      status: 'processed',
      data: {
        cliente_id: result.clienteId,
        suscripcion_id: result.suscripcionId,
        evento_id: result.eventoId,
      },
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Error interno procesando webhook',
      retry: true,
    });
  }
});

export default router;
