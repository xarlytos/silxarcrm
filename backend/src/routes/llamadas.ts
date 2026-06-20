import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { env } from '../config/env';
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
import {
  iniciarLlamadaAI,
  procesarWebhookAI,
  iniciarSimulacionAI,
  enviarMensajeSimulacionAI,
} from '../services/llamadaAiService';

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

// === Webhook Agente AI (validado por secreto) ===
router.post('/webhook/ai', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-agent-secret'] as string;
    if (secret !== env.AI_AGENT_SECRET) {
      logger.warn('Webhook AI con secreto invalido');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await procesarWebhookAI(req.body);
    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook AI error:', error);
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
      modo: req.query.modo as string,
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

// POST /api/llamadas/simular-ai/start
router.post('/simular-ai/start', async (req: Request, res: Response) => {
  try {
    const { softwareId, leadId, spechId } = req.body;
    if (!leadId) {
      res.status(400).json({ error: 'leadId obligatorio' });
      return;
    }
    const result = await iniciarSimulacionAI({
      softwareId,
      leadId,
      spechId,
      agenteId: req.user?.userId || 0,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Simular AI start error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error iniciando simulacion' });
  }
});

// POST /api/llamadas/simular-ai/:sid/mensaje
router.post('/simular-ai/:sid/mensaje', async (req: Request, res: Response) => {
  try {
    const result = await enviarMensajeSimulacionAI(req.params.sid, req.body.text || '');
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Simular AI mensaje error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error enviando mensaje' });
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

// GET /api/llamadas/ai-metrics?softwareId=xxx&dias=30
router.get('/ai-metrics', async (req: Request, res: Response) => {
  try {
    const { softwareId, dias = '30' } = req.query;
    const desde = new Date();
    desde.setDate(desde.getDate() - parseInt(dias as string));

    const llamadas = await prisma.llamadaReal.findMany({
      where: {
        softwareId: softwareId as string,
        modo: 'AI',
        createdAt: { gte: desde },
      },
      select: {
        estado: true,
        duracionSeg: true,
        metadata: true,
        createdAt: true,
      },
    });

    const total = llamadas.length;
    const conectadas = llamadas.filter(l =>
      ['en_curso', 'completada', 'demo_agendada', 'transferido'].includes(l.estado)
    ).length;
    const demos = llamadas.filter(l => l.estado === 'demo_agendada').length;
    const transferidos = llamadas.filter(l => l.estado === 'transferido').length;
    const rechazados = llamadas.filter(l => ['rechazado', 'optout'].includes(l.estado)).length;

    // Calcular métricas enriquecidas desde metadata
    let totalEngagement = 0;
    let totalFrustration = 0;
    let bantCount = 0;
    let bantTotal = { budget: 0, authority: 0, need: 0, timeline: 0 };
    let emotions: Record<string, number> = {};

    for (const l of llamadas) {
      const meta = l.metadata as any;
      if (meta?.engagementScore) totalEngagement += meta.engagementScore;
      if (meta?.frustrationLevel) totalFrustration += meta.frustrationLevel;
      if (meta?.bantScore) {
        bantCount++;
        bantTotal.budget += meta.bantScore.budget;
        bantTotal.authority += meta.bantScore.authority;
        bantTotal.need += meta.bantScore.need;
        bantTotal.timeline += meta.bantScore.timeline;
      }
      if (meta?.emotion) {
        emotions[meta.emotion] = (emotions[meta.emotion] || 0) + 1;
      }
    }

    const withMeta = llamadas.filter(l => (l.metadata as any)?.engagementScore).length;

    res.json({
      success: true,
      data: {
        total,
        conectadas,
        demos,
        transferidos,
        rechazados,
        answerRatePct: total > 0 ? Math.round((conectadas / total) * 100) : 0,
        conversionRatePct: conectadas > 0 ? Math.round((demos / conectadas) * 100) : 0,
        avgEngagement: withMeta > 0 ? Math.round(totalEngagement / withMeta) : 0,
        avgFrustration: withMeta > 0 ? Math.round(totalFrustration / withMeta) : 0,
        avgBant: bantCount > 0 ? {
          budget: Math.round(bantTotal.budget / bantCount),
          authority: Math.round(bantTotal.authority / bantCount),
          need: Math.round(bantTotal.need / bantCount),
          timeline: Math.round(bantTotal.timeline / bantCount),
          total: Math.round((bantTotal.budget + bantTotal.authority + bantTotal.need + bantTotal.timeline) / bantCount),
        } : null,
        emotions,
        periodoDias: parseInt(dias as string),
      },
    });
  } catch (error) {
    logger.error('AI metrics error:', error);
    res.status(500).json({ error: 'Error obteniendo metricas AI' });
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

// POST /api/llamadas/iniciar-ai
router.post('/iniciar-ai', async (req: Request, res: Response) => {
  try {
    const { leadId, spechId } = req.body;
    if (!leadId) {
      res.status(400).json({ error: 'leadId obligatorio' });
      return;
    }
    if (!req.user?.userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const llamada = await iniciarLlamadaAI({
      leadId,
      spechId,
      agenteId: req.user.userId,
    });
    res.status(201).json({ success: true, data: llamada });
  } catch (error) {
    logger.error('Iniciar llamada AI error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error iniciando llamada AI' });
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
