import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ACHIEVEMENTS, DAILY_POOL, WEEKLY_POOL, BOSS_POOL, getTareaStats, getTopClientes } from '../services/tareasService';

const router = Router();
router.use(authMiddleware);

// GET /api/tareas — devuelve catálogo + stats del workspace
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [stats, topClientes] = await Promise.all([getTareaStats(), getTopClientes(12)]);
    res.json({
      success: true,
      data: {
        achievements: ACHIEVEMENTS,
        dailyPool: DAILY_POOL,
        weeklyPool: WEEKLY_POOL,
        bossPool: BOSS_POOL,
        stats,
        topClientes,
      },
    });
  } catch (error) {
    logger.error('Tareas get error:', error);
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

export default router;
