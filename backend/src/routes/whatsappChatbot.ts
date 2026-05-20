import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listReglas,
  getRegla,
  createRegla,
  updateRegla,
  deleteRegla,
} from '../services/whatsappChatbotService';

const router = Router();
router.use(authMiddleware);

router.get('/reglas', async (req: Request, res: Response) => {
  try {
    const data = await listReglas(req.query.softwareId as string | undefined);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Chatbot reglas list error:', error);
    res.status(500).json({ error: 'Error obteniendo reglas' });
  }
});

router.get('/reglas/:id', async (req: Request, res: Response) => {
  try {
    const regla = await getRegla(req.params.id);
    if (!regla) {
      res.status(404).json({ error: 'Regla no encontrada' });
      return;
    }
    res.json({ success: true, data: regla });
  } catch (error) {
    logger.error('Chatbot regla get error:', error);
    res.status(500).json({ error: 'Error obteniendo regla' });
  }
});

router.post('/reglas', async (req: Request, res: Response) => {
  try {
    const regla = await createRegla(req.body);
    res.status(201).json({ success: true, data: regla });
  } catch (error) {
    logger.error('Chatbot regla create error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error creando regla' });
  }
});

router.put('/reglas/:id', async (req: Request, res: Response) => {
  try {
    const regla = await updateRegla(req.params.id, req.body);
    if (!regla) {
      res.status(404).json({ error: 'Regla no encontrada' });
      return;
    }
    res.json({ success: true, data: regla });
  } catch (error) {
    logger.error('Chatbot regla update error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error actualizando regla' });
  }
});

router.delete('/reglas/:id', async (req: Request, res: Response) => {
  try {
    const regla = await deleteRegla(req.params.id);
    if (!regla) {
      res.status(404).json({ error: 'Regla no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Chatbot regla delete error:', error);
    res.status(500).json({ error: 'Error eliminando regla' });
  }
});

export default router;
