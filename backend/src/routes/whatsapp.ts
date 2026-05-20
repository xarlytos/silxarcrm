import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listPlantillas,
  getPlantilla,
  createPlantilla,
  updatePlantilla,
  deletePlantilla,
  generarPlantillaWhatsappIA,
  enviarWhatsapp,
  previewPlantilla,
  listEnvios,
  PLANTILLAS_SEED,
  listABTests,
  getABTest,
  createABTest,
  updateABTest,
  deleteABTest,
  getABTestMetrics,
  getConversacionConHilo,
  listConversaciones,
  appendMensajeAConversacion,
  marcarLeida,
  sugerirRespuesta,
  getLeadsInactivos,
  generarMensajeResurreccion,
  batallaPlantillas,
  generarPerfilesSinteticos,
  listArenaPerfiles,
  crearPerfilManual,
  eliminarArenaPerfil,
  listArenaBattles,
  getArenaBattle,
  deleteArenaBattle,
  updateArenaBattle,
  sparringResponder,
  whisperConsejos,
  getLeadStoryboard,
  generarMensajesPersonalizados,
  resolverSnippet,
  SNIPPETS_DISPONIBLES,
} from '../services/whatsappService';

const router = Router();
router.use(authMiddleware);

/* ============================================================
   Plantillas
============================================================ */

// GET /api/whatsapp/plantillas?softwareId=xxx
router.get('/plantillas', async (req: Request, res: Response) => {
  try {
    const data = await listPlantillas(req.query.softwareId as string | undefined);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp plantillas list error:', error);
    res.status(500).json({ error: 'Error obteniendo plantillas' });
  }
});

router.get('/plantillas/:id', async (req: Request, res: Response) => {
  try {
    const plantilla = await getPlantilla(req.params.id);
    if (!plantilla) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    res.json({ success: true, data: plantilla });
  } catch (error) {
    logger.error('Whatsapp plantilla get error:', error);
    res.status(500).json({ error: 'Error obteniendo plantilla' });
  }
});

router.post('/plantillas', async (req: Request, res: Response) => {
  try {
    const plantilla = await createPlantilla(req.body);
    res.status(201).json({ success: true, data: plantilla });
  } catch (error) {
    logger.error('Whatsapp plantilla create error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error creando plantilla' });
  }
});

// POST /api/whatsapp/plantillas/generar-ia — genera plantilla con IA
router.post('/plantillas/generar-ia', async (req: Request, res: Response) => {
  try {
    const { softwareId, categoria, objetivo, tono, longitud } = req.body;
    if (!softwareId?.trim() || !objetivo?.trim()) {
      res.status(400).json({ error: 'softwareId y objetivo son obligatorios' });
      return;
    }
    const generada = await generarPlantillaWhatsappIA({ softwareId, categoria, objetivo, tono, longitud });
    res.json({ success: true, data: generada });
  } catch (error) {
    logger.error('Whatsapp plantilla generar-ia error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando plantilla con IA' });
  }
});

router.put('/plantillas/:id', async (req: Request, res: Response) => {
  try {
    const plantilla = await updatePlantilla(req.params.id, req.body);
    if (!plantilla) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    res.json({ success: true, data: plantilla });
  } catch (error) {
    logger.error('Whatsapp plantilla update error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error actualizando plantilla' });
  }
});

router.delete('/plantillas/:id', async (req: Request, res: Response) => {
  try {
    const plantilla = await deletePlantilla(req.params.id);
    if (!plantilla) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Whatsapp plantilla delete error:', error);
    res.status(500).json({ error: 'Error eliminando plantilla' });
  }
});

// POST /api/whatsapp/plantillas/seed { softwareId } — crea plantillas iniciales
router.post('/plantillas/seed', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    const creadas = [];
    for (const p of PLANTILLAS_SEED) {
      try {
        const nueva = await createPlantilla({ ...p, softwareId });
        creadas.push(nueva);
      } catch (e) {
        // Ignorar duplicados
        logger.warn(`Seed plantilla "${p.nombre}" omitida:`, (e as Error).message);
      }
    }
    res.status(201).json({ success: true, data: creadas });
  } catch (error) {
    logger.error('Whatsapp plantillas seed error:', error);
    res.status(500).json({ error: 'Error sembrando plantillas' });
  }
});

/* ============================================================
   Envíos
============================================================ */

// POST /api/whatsapp/enviar { leadId, plantillaId?, contenidoFinal? }
router.post('/enviar', async (req: Request, res: Response) => {
  try {
    const usuarioId = req.user?.userId;
    const result = await enviarWhatsapp({ ...req.body, usuarioId });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('Whatsapp enviar error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando envío' });
  }
});

// POST /api/whatsapp/preview { plantillaId, leadId }
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { plantillaId, leadId } = req.body;
    if (!plantillaId || !leadId) {
      res.status(400).json({ error: 'plantillaId y leadId son obligatorios' });
      return;
    }
    const data = await previewPlantilla(plantillaId, leadId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp preview error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando preview' });
  }
});

// GET /api/whatsapp/envios?leadId=xxx | ?softwareId=xxx
router.get('/envios', async (req: Request, res: Response) => {
  try {
    const data = await listEnvios({
      leadId: req.query.leadId as string | undefined,
      softwareId: req.query.softwareId as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp envios list error:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

/* ============================================================
   A/B Tests
============================================================ */

// GET /api/whatsapp/ab-tests?softwareId=xxx
router.get('/ab-tests', async (req: Request, res: Response) => {
  try {
    const data = await listABTests(req.query.softwareId as string | undefined);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('AB tests list error:', error);
    res.status(500).json({ error: 'Error obteniendo tests A/B' });
  }
});

// GET /api/whatsapp/ab-tests/:id
router.get('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const test = await getABTest(req.params.id);
    if (!test) {
      res.status(404).json({ error: 'Test A/B no encontrado' });
      return;
    }
    res.json({ success: true, data: test });
  } catch (error) {
    logger.error('AB test get error:', error);
    res.status(500).json({ error: 'Error obteniendo test A/B' });
  }
});

// GET /api/whatsapp/ab-tests/:id/metrics
router.get('/ab-tests/:id/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await getABTestMetrics(req.params.id);
    if (!metrics) {
      res.status(404).json({ error: 'Test A/B no encontrado' });
      return;
    }
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('AB test metrics error:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// POST /api/whatsapp/ab-tests
router.post('/ab-tests', async (req: Request, res: Response) => {
  try {
    const test = await createABTest(req.body);
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    logger.error('AB test create error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error creando test A/B' });
  }
});

// PUT /api/whatsapp/ab-tests/:id
router.put('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const test = await updateABTest(req.params.id, req.body);
    if (!test) {
      res.status(404).json({ error: 'Test A/B no encontrado' });
      return;
    }
    res.json({ success: true, data: test });
  } catch (error) {
    logger.error('AB test update error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error actualizando test A/B' });
  }
});

// DELETE /api/whatsapp/ab-tests/:id
router.delete('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const test = await deleteABTest(req.params.id);
    if (!test) {
      res.status(404).json({ error: 'Test A/B no encontrado' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('AB test delete error:', error);
    res.status(500).json({ error: 'Error eliminando test A/B' });
  }
});

/* ============================================================
   Conversaciones (hilo manual / híbrido)
============================================================ */

// GET /api/whatsapp/conversaciones?softwareId=xxx — lista todas las conversaciones del workspace
router.get('/conversaciones', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string | undefined;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    const data = await listConversaciones(softwareId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp conversaciones list error:', error);
    res.status(500).json({ error: 'Error obteniendo conversaciones' });
  }
});

// GET /api/whatsapp/conversaciones/:leadId — obtiene el hilo completo
router.get('/conversaciones/:leadId', async (req: Request, res: Response) => {
  try {
    const data = await getConversacionConHilo(req.params.leadId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp conversacion get error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error obteniendo conversación' });
  }
});

// POST /api/whatsapp/conversaciones/:leadId/mensajes
// body: { direccion: 'IN' | 'OUT', cuerpo: string, iaGenerado?: boolean }
router.post('/conversaciones/:leadId/mensajes', async (req: Request, res: Response) => {
  try {
    const { direccion, cuerpo, iaGenerado } = req.body || {};
    const mensaje = await appendMensajeAConversacion({
      leadId: req.params.leadId,
      direccion,
      cuerpo,
      iaGenerado,
      usuarioId: req.user?.userId,
    });
    res.status(201).json({ success: true, data: mensaje });
  } catch (error) {
    logger.error('Whatsapp conversacion add mensaje error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error añadiendo mensaje' });
  }
});

// POST /api/whatsapp/conversaciones/:leadId/leida — pone noLeidos = 0
router.post('/conversaciones/:leadId/leida', async (req: Request, res: Response) => {
  try {
    const data = await marcarLeida(req.params.leadId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp conversacion marcar leida error:', error);
    res.status(500).json({ error: 'Error marcando como leída' });
  }
});

// POST /api/whatsapp/conversaciones/:leadId/sugerir
// body: { instrucciones?: string }  → MiniMax devuelve un texto sugerido (NO se guarda)
router.post('/conversaciones/:leadId/sugerir', async (req: Request, res: Response) => {
  try {
    const data = await sugerirRespuesta({
      leadId: req.params.leadId,
      instrucciones: req.body?.instrucciones,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whatsapp conversacion sugerir error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error pidiendo sugerencia' });
  }
});

/* ============================================================
   Secciones creativas
============================================================ */

// GET /api/whatsapp/cementerio?softwareId=&dias=30
router.get('/cementerio', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string;
    if (!softwareId) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    const dias = req.query.dias ? Number(req.query.dias) : 30;
    const data = await getLeadsInactivos(softwareId, dias);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Cementerio error:', error);
    res.status(500).json({ error: 'Error listando leads inactivos' });
  }
});

// POST /api/whatsapp/cementerio/resurrect { leadId, pretexto? }
router.post('/cementerio/resurrect', async (req: Request, res: Response) => {
  try {
    const { leadId, pretexto } = req.body || {};
    if (!leadId) {
      res.status(400).json({ error: 'leadId obligatorio' });
      return;
    }
    const data = await generarMensajeResurreccion(leadId, pretexto);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Resurrección error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando mensaje' });
  }
});

// POST /api/whatsapp/arena
router.post('/arena', async (req: Request, res: Response) => {
  try {
    const data = await batallaPlantillas({ ...req.body, usuarioId: req.user?.userId });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Arena error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error en batalla' });
  }
});

// GET /api/whatsapp/arena/perfiles?softwareId=xxx
router.get('/arena/perfiles', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string;
    if (!softwareId) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    const data = await listArenaPerfiles(softwareId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Arena perfiles list error:', error);
    res.status(500).json({ error: 'Error listando perfiles' });
  }
});

// POST /api/whatsapp/arena/perfiles { softwareId, cantidad, regenerar? }
router.post('/arena/perfiles', async (req: Request, res: Response) => {
  try {
    const data = await generarPerfilesSinteticos(req.body);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Arena perfiles error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando perfiles' });
  }
});

// POST /api/whatsapp/arena/perfiles/manual { softwareId, nombre, descripcion }
router.post('/arena/perfiles/manual', async (req: Request, res: Response) => {
  try {
    const { softwareId, nombre, descripcion } = req.body;
    if (!softwareId || !nombre || !descripcion) {
      res.status(400).json({ error: 'softwareId, nombre y descripcion obligatorios' });
      return;
    }
    const data = await crearPerfilManual(softwareId, { nombre, descripcion });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Arena perfil manual error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error creando perfil' });
  }
});

// DELETE /api/whatsapp/arena/perfiles/:id
router.delete('/arena/perfiles/:id', async (req: Request, res: Response) => {
  try {
    await eliminarArenaPerfil(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Arena perfil delete error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error eliminando perfil' });
  }
});

// GET /api/whatsapp/arena/battles?softwareId=xxx
router.get('/arena/battles', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string;
    if (!softwareId) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    const data = await listArenaBattles(softwareId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Arena battles list error:', error);
    res.status(500).json({ error: 'Error listando batallas' });
  }
});

// GET /api/whatsapp/arena/battles/:id
router.get('/arena/battles/:id', async (req: Request, res: Response) => {
  try {
    const battle = await getArenaBattle(req.params.id);
    if (!battle) {
      res.status(404).json({ error: 'Batalla no encontrada' });
      return;
    }
    res.json({ success: true, data: battle });
  } catch (error) {
    logger.error('Arena battle get error:', error);
    res.status(500).json({ error: 'Error obteniendo batalla' });
  }
});

// PATCH /api/whatsapp/arena/battles/:id { nota }
router.patch('/arena/battles/:id', async (req: Request, res: Response) => {
  try {
    const data = await updateArenaBattle(req.params.id, { nota: req.body?.nota });
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Arena battle update error:', error);
    res.status(500).json({ error: 'Error actualizando batalla' });
  }
});

// DELETE /api/whatsapp/arena/battles/:id
router.delete('/arena/battles/:id', async (req: Request, res: Response) => {
  try {
    const result = await deleteArenaBattle(req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Batalla no encontrada' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Arena battle delete error:', error);
    res.status(500).json({ error: 'Error eliminando batalla' });
  }
});

// POST /api/whatsapp/sparring { leadId, hilo: [{role, texto}] }
router.post('/sparring', async (req: Request, res: Response) => {
  try {
    const data = await sparringResponder(req.body);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Sparring error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error en sparring' });
  }
});

// POST /api/whatsapp/whisper { leadId, borrador }
router.post('/whisper', async (req: Request, res: Response) => {
  try {
    const data = await whisperConsejos(req.body);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Whisper error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error en whisper' });
  }
});

// GET /api/whatsapp/storyboard/:leadId
router.get('/storyboard/:leadId', async (req: Request, res: Response) => {
  try {
    const data = await getLeadStoryboard(req.params.leadId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Storyboard error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando storyboard' });
  }
});

// POST /api/whatsapp/personalizar-masa { leadIds, objetivo, toneRef? }
router.post('/personalizar-masa', async (req: Request, res: Response) => {
  try {
    const data = await generarMensajesPersonalizados(req.body);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Personalizar masa error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error generando lote' });
  }
});

// GET /api/whatsapp/snippets — lista de comandos disponibles
router.get('/snippets', async (_req: Request, res: Response) => {
  res.json({ success: true, data: SNIPPETS_DISPONIBLES });
});

// POST /api/whatsapp/snippet { comando, leadId?, borrador? }
router.post('/snippet', async (req: Request, res: Response) => {
  try {
    const data = await resolverSnippet(req.body);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Snippet error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error resolviendo snippet' });
  }
});

export default router;
