import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listLandings,
  getLandingById,
  createLanding,
  updateLanding,
  deleteLanding,
  getLandingStats,
} from '../services/landingService';
import { LandingEstado } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await listLandings({
      softwareId: req.query.softwareId as string,
      estado: req.query.estado as LandingEstado,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Landings list error:', error);
    res.status(500).json({ error: 'Error obteniendo landings' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getLandingStats(req.query.softwareId as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Landings stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const landing = await getLandingById(req.params.id);
    if (!landing) {
      res.status(404).json({ error: 'Landing no encontrada' });
      return;
    }
    res.json({ success: true, data: landing });
  } catch (error) {
    logger.error('Landing detail error:', error);
    res.status(500).json({ error: 'Error obteniendo landing' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const landing = await createLanding(req.body);
    res.status(201).json({ success: true, data: landing });
  } catch (error) {
    logger.error('Create landing error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una landing con ese slug para este software' });
      return;
    }
    res.status(500).json({ error: (error as Error).message || 'Error creando landing' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const landing = await updateLanding(req.params.id, req.body);
    if (!landing) {
      res.status(404).json({ error: 'Landing no encontrada' });
      return;
    }
    res.json({ success: true, data: landing });
  } catch (error) {
    logger.error('Update landing error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una landing con ese slug para este software' });
      return;
    }
    res.status(500).json({ error: 'Error actualizando landing' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteLanding(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete landing error:', error);
    res.status(500).json({ error: 'Error eliminando landing' });
  }
});

export default router;
