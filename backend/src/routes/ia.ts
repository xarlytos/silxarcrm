import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { chatWithIA } from '../services/iaService';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

// POST /api/ia/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Mensaje requerido' });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: 'Mensaje demasiado largo (máx 2000 caracteres)' });
      return;
    }

    const result = await chatWithIA(req.user!.userId, message);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('IA chat error:', error);
    res.status(500).json({ error: 'Error en el servicio de IA' });
  }
});

// GET /api/ia/history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [conversations, total] = await Promise.all([
      prisma.conversacionIa.findMany({
        where: { usuarioId: req.user!.userId },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversacionIa.count({ where: { usuarioId: req.user!.userId } }),
    ]);

    res.json({
      success: true,
      data: { conversations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error('IA history error:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// GET /api/ia/suggestions - Quick query suggestions
router.get('/suggestions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      '¿Cuánto facturé ayer?',
      '¿Cuál es mi MRR actual?',
      '¿Qué SaaS tiene más churn?',
      '¿Cuántos trials se convirtieron esta semana?',
      '¿Cuántos clientes nuevos tengo este mes?',
      '¿Cuáles son los pagos fallidos recientes?',
      '¿Cuál es la proyección de ingresos para el próximo mes?',
      '¿Qué clientes están por expirar su trial?',
    ],
  });
});

export default router;
