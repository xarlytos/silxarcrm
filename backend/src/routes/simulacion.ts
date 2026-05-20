import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  iniciarSimulacion,
  enviarMensaje,
  finalizarSimulacion,
  listSimulaciones,
  getSimulacion,
  deleteSimulacion,
} from '../services/simulacionService';

const router = Router();
router.use(authMiddleware);

// GET /api/simulacion?softwareId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await listSimulaciones({
      softwareId: req.query.softwareId as string,
      usuarioId: req.query.usuarioId
        ? parseInt(req.query.usuarioId as string)
        : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Simulaciones list error:', error);
    res.status(500).json({ error: 'Error obteniendo simulaciones' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sim = await getSimulacion(req.params.id);
    if (!sim) {
      res.status(404).json({ error: 'Simulacion no encontrada' });
      return;
    }
    res.json({ success: true, data: sim });
  } catch (error) {
    logger.error('Simulacion get error:', error);
    res.status(500).json({ error: 'Error obteniendo simulacion' });
  }
});

// POST /api/simulacion/iniciar
router.post('/iniciar', async (req: Request, res: Response) => {
  try {
    const { softwareId, spechId, leadSimulado } = req.body;
    if (!softwareId || !leadSimulado || !leadSimulado.nombre || !leadSimulado.personalidad) {
      res.status(400).json({ error: 'softwareId y leadSimulado.{nombre,personalidad} obligatorios' });
      return;
    }
    const result = await iniciarSimulacion({
      softwareId,
      spechId,
      leadSimulado,
      usuarioId: req.user?.userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Simulacion iniciar error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error iniciando simulacion' });
  }
});

// POST /api/simulacion/:id/mensaje
router.post('/:id/mensaje', async (req: Request, res: Response) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      res.status(400).json({ error: 'texto obligatorio' });
      return;
    }
    const result = await enviarMensaje(req.params.id, texto);
    if (!result) {
      res.status(404).json({ error: 'Sesion no encontrada' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Simulacion mensaje error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error enviando mensaje' });
  }
});

// POST /api/simulacion/:id/finalizar
router.post('/:id/finalizar', async (req: Request, res: Response) => {
  try {
    const result = await finalizarSimulacion(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Sesion no encontrada' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Simulacion finalizar error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error finalizando simulacion' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const sim = await deleteSimulacion(req.params.id);
    if (!sim) {
      res.status(404).json({ error: 'Simulacion no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Simulacion delete error:', error);
    res.status(500).json({ error: 'Error eliminando simulacion' });
  }
});

export default router;
