import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  iniciarLlamada,
  listLlamadas,
  getLlamada,
  actualizarNotasLlamada,
  deleteLlamada,
  procesarWebhookZadarma,
  getStatsLlamadas,
} from '../services/llamadaService';
import { getRecordingUrl } from '../services/zadarmaService';

const router = Router();

// === Webhook Zadarma (sin auth, validado por payload) ===
router.post('/webhook/zadarma', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    logger.info('Zadarma webhook recibido', { event: payload?.event, callId: payload?.call_id });

    if (req.query.zd_echo) {
      const echo = req.query.zd_echo as string;
      res.type('text/plain').send(echo);
      return;
    }

    await procesarWebhookZadarma(payload);
    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook Zadarma error:', error);
    res.status(200).json({ success: false });
  }
});

// El resto requiere autenticacion
router.use(authMiddleware);

// GET /api/llamadas
router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await listLlamadas({
      softwareId: req.query.softwareId as string,
      leadId: req.query.leadId as string,
      agenteId: req.query.agenteId
        ? parseInt(req.query.agenteId as string)
        : undefined,
      estado: req.query.estado as string,
      desde: req.query.desde as string,
      hasta: req.query.hasta as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 25,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Llamadas list error:', error);
    res.status(500).json({ error: 'Error obteniendo llamadas' });
  }
});

// GET /api/llamadas/stats?softwareId=xxx
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getStatsLlamadas(req.query.softwareId as string);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Llamadas stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadisticas' });
  }
});

// GET /api/llamadas/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const llamada = await getLlamada(req.params.id);
    if (!llamada) {
      res.status(404).json({ error: 'Llamada no encontrada' });
      return;
    }
    res.json({ success: true, data: llamada });
  } catch (error) {
    logger.error('Llamada get error:', error);
    res.status(500).json({ error: 'Error obteniendo llamada' });
  }
});

// POST /api/llamadas/iniciar
router.post('/iniciar', async (req: Request, res: Response) => {
  try {
    const { leadId, spechId, telefonoAgente } = req.body;
    if (!leadId) {
      res.status(400).json({ error: 'leadId obligatorio' });
      return;
    }
    if (!req.user?.userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const llamada = await iniciarLlamada({
      leadId,
      spechId,
      telefonoAgente,
      agenteId: req.user.userId,
    });
    res.status(201).json({ success: true, data: llamada });
  } catch (error) {
    logger.error('Iniciar llamada error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error iniciando llamada' });
  }
});

// PUT /api/llamadas/:id/notas
router.put('/:id/notas', async (req: Request, res: Response) => {
  try {
    const { notasPost, calificacion, proximaAccion, nuevoEstadoLead } = req.body;
    const llamada = await actualizarNotasLlamada(req.params.id, {
      notasPost,
      calificacion,
      proximaAccion,
      nuevoEstadoLead,
    });
    if (!llamada) {
      res.status(404).json({ error: 'Llamada no encontrada' });
      return;
    }
    res.json({ success: true, data: llamada });
  } catch (error) {
    logger.error('Actualizar notas llamada error:', error);
    res.status(500).json({ error: 'Error actualizando notas' });
  }
});

// GET /api/llamadas/:id/audio
router.get('/:id/audio', async (req: Request, res: Response) => {
  try {
    const llamada = await getLlamada(req.params.id);
    if (!llamada) {
      res.status(404).json({ error: 'Llamada no encontrada' });
      return;
    }
    if (llamada.grabacionUrl) {
      res.json({ success: true, data: { url: llamada.grabacionUrl } });
      return;
    }
    if (!llamada.zadarmaCallId) {
      res.status(404).json({ error: 'Sin grabacion disponible' });
      return;
    }
    const data = await getRecordingUrl(llamada.zadarmaCallId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Audio fetch error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error obteniendo audio' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const llamada = await deleteLlamada(req.params.id);
    if (!llamada) {
      res.status(404).json({ error: 'Llamada no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete llamada error:', error);
    res.status(500).json({ error: 'Error eliminando llamada' });
  }
});

export default router;
