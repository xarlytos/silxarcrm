import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { createCrmClient, getTrackingMetrics, generateApiKey } from '../services/trackingService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/admin/crm-clients - Listar todos los CRM clients
router.get('/crm-clients', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.crmClient.findMany({
      include: {
        _count: { select: { trackedEvents: true } },
        apiKeys: {
          select: {
            id: true,
            keyPrefix: true,
            nombre: true,
            activo: true,
            ultimoUso: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: clients });
  } catch (error) {
    logger.error('Error listing CRM clients:', error);
    res.status(500).json({ error: 'Error obteniendo CRM clients' });
  }
});

// POST /api/admin/crm-clients - Crear nuevo CRM client
router.post('/crm-clients', async (req: Request, res: Response) => {
  try {
    const { name, saas, descripcion } = req.body;

    if (!name || !saas) {
      res.status(400).json({ error: 'Nombre y SaaS son requeridos' });
      return;
    }

    const { crm, apiKey } = await createCrmClient(name, saas, descripcion);

    res.status(201).json({
      success: true,
      data: {
        crm,
        apiKey,
        message: 'Guarda esta API Key, no se mostrará de nuevo',
      },
    });
  } catch (error) {
    logger.error('Error creating CRM client:', error);
    res.status(500).json({ error: 'Error creando CRM client' });
  }
});

// POST /api/admin/crm-clients/:id/api-keys - Generar nueva API Key
router.post('/crm-clients/:id/api-keys', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    const crm = await prisma.crmClient.findUnique({ where: { id } });
    if (!crm) {
      res.status(404).json({ error: 'CRM client no encontrado' });
      return;
    }

    const { key, hash, prefix } = generateApiKey();

    await prisma.apiKey.create({
      data: {
        crmId: id,
        keyHash: hash,
        keyPrefix: prefix,
        nombre: nombre || 'Nueva Key',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        apiKey: key,
        prefix,
        message: 'Guarda esta API Key, no se mostrará de nuevo',
      },
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({ error: 'Error creando API key' });
  }
});

// DELETE /api/admin/api-keys/:id - Revocar API Key
router.delete('/api-keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.apiKey.update({
      where: { id },
      data: { activo: false },
    });

    res.json({ success: true, message: 'API Key revocada' });
  } catch (error) {
    logger.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Error revocando API key' });
  }
});

// GET /api/admin/crm-clients/:id/metrics - Métricas de tracking
router.get('/crm-clients/:id/metrics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const crm = await prisma.crmClient.findUnique({ where: { id } });
    if (!crm) {
      res.status(404).json({ error: 'CRM client no encontrado' });
      return;
    }

    const metrics = await getTrackingMetrics(id, days);

    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Error getting tracking metrics:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// GET /api/admin/crm-clients/:id/events - Eventos recientes
router.get('/crm-clients/:id/events', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const events = await prisma.trackedEvent.findMany({
      where: { crmId: id },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        eventName: true,
        userId: true,
        email: true,
        timestamp: true,
        datos: true,
        procesado: true,
      },
    });

    res.json({ success: true, data: events });
  } catch (error) {
    logger.error('Error getting events:', error);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
});

export default router;
