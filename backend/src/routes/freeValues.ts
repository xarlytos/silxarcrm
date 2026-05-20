import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listFreeValues,
  getFreeValueById,
  createFreeValue,
  updateFreeValue,
  deleteFreeValue,
  getFreeValueStats,
} from '../services/freeValueService';
import { FreeValueEstado } from '@prisma/client';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await listFreeValues({
      softwareId: req.query.softwareId as string,
      estado: req.query.estado as FreeValueEstado,
      tipo: req.query.tipo as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('FreeValues list error:', error);
    res.status(500).json({ error: 'Error obteniendo free values' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getFreeValueStats(req.query.softwareId as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('FreeValues stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fv = await getFreeValueById(req.params.id);
    if (!fv) {
      res.status(404).json({ error: 'Free value no encontrado' });
      return;
    }
    res.json({ success: true, data: fv });
  } catch (error) {
    logger.error('FreeValue detail error:', error);
    res.status(500).json({ error: 'Error obteniendo free value' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const fv = await createFreeValue(req.body);
    res.status(201).json({ success: true, data: fv });
  } catch (error) {
    logger.error('Create freeValue error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un free value con ese slug para este software' });
      return;
    }
    res.status(500).json({ error: (error as Error).message || 'Error creando free value' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const fv = await updateFreeValue(req.params.id, req.body);
    if (!fv) {
      res.status(404).json({ error: 'Free value no encontrado' });
      return;
    }
    res.json({ success: true, data: fv });
  } catch (error) {
    logger.error('Update freeValue error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un free value con ese slug para este software' });
      return;
    }
    res.status(500).json({ error: 'Error actualizando free value' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteFreeValue(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete freeValue error:', error);
    res.status(500).json({ error: 'Error eliminando free value' });
  }
});

export default router;
