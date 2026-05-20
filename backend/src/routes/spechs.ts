import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listSpechs,
  getSpechById,
  createSpech,
  updateSpech,
  deleteSpech,
  setDefaultSpech,
  reorderSpechs,
  duplicateSpech,
} from '../services/spechService';

const router = Router();
router.use(authMiddleware);

// GET /api/spechs?softwareId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await listSpechs(req.query.softwareId as string | undefined);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Spechs list error:', error);
    res.status(500).json({ error: 'Error obteniendo spechs' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const spech = await getSpechById(req.params.id);
    if (!spech) {
      res.status(404).json({ error: 'Spech no encontrado' });
      return;
    }
    res.json({ success: true, data: spech });
  } catch (error) {
    logger.error('Spech get error:', error);
    res.status(500).json({ error: 'Error obteniendo spech' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const spech = await createSpech(req.body);
    res.status(201).json({ success: true, data: spech });
  } catch (error) {
    logger.error('Spech create error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error creando spech' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const spech = await updateSpech(req.params.id, req.body);
    if (!spech) {
      res.status(404).json({ error: 'Spech no encontrado' });
      return;
    }
    res.json({ success: true, data: spech });
  } catch (error) {
    logger.error('Spech update error:', error);
    res.status(500).json({ error: 'Error actualizando spech' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const spech = await deleteSpech(req.params.id);
    if (!spech) {
      res.status(404).json({ error: 'Spech no encontrado' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Spech delete error:', error);
    res.status(500).json({ error: 'Error eliminando spech' });
  }
});

router.put('/:id/default', async (req: Request, res: Response) => {
  try {
    const spech = await setDefaultSpech(req.params.id);
    if (!spech) {
      res.status(404).json({ error: 'Spech no encontrado' });
      return;
    }
    res.json({ success: true, data: spech });
  } catch (error) {
    logger.error('Spech set default error:', error);
    res.status(500).json({ error: 'Error marcando default' });
  }
});

router.post('/:id/duplicar', async (req: Request, res: Response) => {
  try {
    const spech = await duplicateSpech(req.params.id);
    if (!spech) {
      res.status(404).json({ error: 'Spech no encontrado' });
      return;
    }
    res.status(201).json({ success: true, data: spech });
  } catch (error) {
    logger.error('Spech duplicate error:', error);
    res.status(500).json({ error: 'Error duplicando spech' });
  }
});

router.put('/orden/reordenar', async (req: Request, res: Response) => {
  try {
    const { softwareId, ids } = req.body;
    if (!softwareId || !Array.isArray(ids)) {
      res.status(400).json({ error: 'softwareId e ids son obligatorios' });
      return;
    }
    const data = await reorderSpechs(softwareId, ids);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Spech reorder error:', error);
    res.status(500).json({ error: 'Error reordenando' });
  }
});

export default router;
