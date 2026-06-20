import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import {
  getVoiceAgentConfig,
  getVoiceAgentConfigBySlug,
  upsertVoiceAgentConfig,
  deleteVoiceAgentConfig,
  seedVoiceAgentConfigs,
  cloneVoiceAgentConfig,
  generateFromSoftware,
  VoiceAgentConfigInput,
} from '../services/voiceAgentConfigService';

const router = Router();

// ── Middleware para validar API key (usado por el agente Python) ──
function validateApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = env.AI_AGENT_SECRET;

  if (!expectedKey) {
    logger.warn('AI_AGENT_SECRET no configurado, saltando validacion de API key');
    return next();
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: API key invalida' });
  }

  next();
}

// ═══════════════════════════════════════════════════════════════
// PUBLICO (con API key) — Usado por el agente Python
// ═══════════════════════════════════════════════════════════════

// GET /api/voice-agent/config/:softwareId
// Devuelve la configuracion completa del agente de voz para un software
router.get('/config/:softwareId', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const config = await getVoiceAgentConfig(softwareId);

    if (!config) {
      // Intentar buscar por slug como fallback
      const configBySlug = await getVoiceAgentConfigBySlug(softwareId);
      if (configBySlug) {
        return res.json({ success: true, data: configBySlug });
      }
      return res.status(404).json({ success: false, error: 'Configuracion no encontrada' });
    }

    res.json({ success: true, data: config });
  } catch (error: any) {
    logger.error('Error obteniendo VoiceAgentConfig:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/voice-agent/config-by-slug/:slug
// Devuelve config buscando por slug del software
router.get('/config-by-slug/:slug', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const config = await getVoiceAgentConfigBySlug(slug);

    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuracion no encontrada' });
    }

    res.json({ success: true, data: config });
  } catch (error: any) {
    logger.error('Error obteniendo VoiceAgentConfig por slug:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN (con auth) — Usado desde el dashboard
// ═══════════════════════════════════════════════════════════════

router.use(authMiddleware);

// GET /api/voice-agent/admin/config/:softwareId
router.get('/admin/config/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const config = await getVoiceAgentConfig(softwareId);

    if (!config) {
      return res.status(404).json({ success: false, error: 'Configuracion no encontrada' });
    }

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/voice-agent/admin/config/:softwareId
// Crear o actualizar config
router.put('/admin/config/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const data = req.body as VoiceAgentConfigInput;

    const config = await upsertVoiceAgentConfig(softwareId, data);
    res.json({ success: true, data: config });
  } catch (error: any) {
    logger.error('Error guardando VoiceAgentConfig:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/voice-agent/admin/config/:softwareId
router.delete('/admin/config/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    await deleteVoiceAgentConfig(softwareId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/voice-agent/admin/generate/:softwareId
// Auto-generar config desde el modelo Software
router.post('/admin/generate/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const config = await generateFromSoftware(softwareId);
    const saved = await upsertVoiceAgentConfig(softwareId, config);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    logger.error('Error generando VoiceAgentConfig:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/voice-agent/admin/clone
// Clonar config de un software a otro
// Body: { sourceSoftwareId, targetSoftwareId }
router.post('/admin/clone', async (req: Request, res: Response) => {
  try {
    const { sourceSoftwareId, targetSoftwareId } = req.body;
    if (!sourceSoftwareId || !targetSoftwareId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren sourceSoftwareId y targetSoftwareId',
      });
    }

    const cloned = await cloneVoiceAgentConfig(sourceSoftwareId, targetSoftwareId);
    res.json({ success: true, data: cloned });
  } catch (error: any) {
    logger.error('Error clonando VoiceAgentConfig:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/voice-agent/admin/seed
// Seed todas las configs para softwares existentes
router.post('/admin/seed', async (_req: Request, res: Response) => {
  try {
    const result = await seedVoiceAgentConfigs();
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error en seed VoiceAgentConfig:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
