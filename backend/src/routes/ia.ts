import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { chatWithIA, chatWithIAStream, getInsights, executeAction, cancelAction, getPendingActions, getActions } from '../services/iaService';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

const router = Router();
router.use(authMiddleware);

// POST /api/ia/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Mensaje requerido' });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: 'Mensaje demasiado largo (máx 2000 caracteres)' });
      return;
    }

    const result = await chatWithIA(req.user!.userId, message);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('IA chat error:', error);
    res.status(500).json({ error: 'Error en el servicio de IA' });
  }
});

// POST /api/ia/chat-stream - Streaming response
router.post('/chat-stream', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Mensaje requerido' });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: 'Mensaje demasiado largo (máx 2000 caracteres)' });
      return;
    }

    // Set NDJSON streaming headers
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const write = (type: string, data: any) => {
      res.write(JSON.stringify({ type, data }) + '\n');
    };

    await chatWithIAStream(req.user!.userId, message, {
      onToken: (token) => write('token', { content: token }),
      onError: (error) => {
        write('error', { message: error });
        res.end();
      },
      onComplete: (result) => {
        write('complete', result);
        res.end();
      },
    });
  } catch (error) {
    logger.error('IA chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error en el servicio de IA' });
    } else {
      res.write(JSON.stringify({ type: 'error', data: { message: 'Error interno' } }) + '\n');
      res.end();
    }
  }
});

// GET /api/ia/history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [conversations, total] = await Promise.all([
      prisma.conversacionIa.findMany({
        where: { usuarioId: req.user!.userId },
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.conversacionIa.count({ where: { usuarioId: req.user!.userId } }),
    ]);

    res.json({
      success: true,
      data: { conversations, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error('IA history error:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// POST /api/ia/generate-plantilla - Genera una plantilla de email con IA
router.post('/generate-plantilla', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tipo, objetivo, tono, industria, softwareId } = req.body;
    if (!tipo || !objetivo || !softwareId) {
      res.status(400).json({ error: 'tipo, objetivo y softwareId son obligatorios' });
      return;
    }

    const prompt = `Eres un copywriter experto en email marketing B2B para SaaS.

Genera una plantilla de email con los siguientes parámetros:
- Tipo de email: ${tipo}
- Objetivo: ${objetivo}
- Tono: ${tono || 'profesional'}
- Industria/nicho: ${industria || 'general SaaS'}

REGLAS:
1. El asunto debe ser atractivo, corto (máx 60 caracteres) y personalizable.
2. El cuerpo debe ser HTML limpio con etiquetas básicas (<p>, <strong>, <ul>, <li>, <br>).
3. Usa variables en formato {{nombre}} para personalización. Variables disponibles: {{nombre}}, {{empresa}}, {{email}}, {{telefono}}, {{municipio}}.
4. Incluye un CTA claro.
5. No uses estilos CSS inline complejos.
6. El email debe tener entre 80 y 250 palabras.
7. No incluyas el saludo "Estimado" fijo; usa {{nombre}} para personalizar.

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "nombre": "Nombre descriptivo de la plantilla",
  "asunto": "Asunto del email",
  "cuerpoHtml": "<p>Hola {{nombre}},</p>\n<p>...cuerpo...</p>",
  "variables": ["nombre", "empresa", ...],
  "cuerpoTexto": "Versión en texto plano"
}`;

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'Eres un copywriter experto en email marketing B2B. Generas plantillas de email en español (España).' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content || '';
    let parsed;
    try {
      // Intenta extraer JSON del contenido (por si hay markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      res.status(500).json({ error: 'La IA no generó un formato válido. Inténtalo de nuevo.' });
      return;
    }

    if (!parsed.asunto || !parsed.cuerpoHtml) {
      res.status(500).json({ error: 'Respuesta incompleta de la IA. Inténtalo de nuevo.' });
      return;
    }

    res.json({
      success: true,
      data: {
        softwareId,
        tipo,
        nombre: parsed.nombre || `Plantilla ${tipo}`,
        asunto: parsed.asunto,
        cuerpoHtml: parsed.cuerpoHtml,
        cuerpoTexto: parsed.cuerpoTexto || parsed.cuerpoHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        variables: parsed.variables || ['nombre'],
      },
    });
  } catch (error) {
    logger.error('IA generate plantilla error:', error);
    res.status(500).json({ error: 'Error generando plantilla con IA' });
  }
});

// GET /api/ia/insights - Insights proactivos
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string | undefined;
    const insights = await getInsights(softwareId);
    res.json({ success: true, data: insights });
  } catch (error) {
    logger.error('IA insights error:', error);
    res.status(500).json({ error: 'Error obteniendo insights' });
  }
});

// GET /api/ia/suggestions - Smart suggestions based on actual data
router.get('/suggestions', async (_req: Request, res: Response) => {
  try {
    // Combine static + data-aware suggestions
    const baseSuggestions = [
      'Resume el estado de mi negocio',
      '¿Cuántos leads tengo por estado?',
      'Muestra las campañas de email con mejor rendimiento',
      '¿Qué eventos tengo en el calendario esta semana?',
      'Dame insights y alertas importantes',
      '¿Cuál es mi MRR actual?',
      'Muestra las llamadas realizadas hoy',
      '¿Cuántos leads sin contactar tengo?',
      'Marca el lead de Juan como contactado',
      'Programa una llamada con Ana García para mañana a las 10',
      'Añade una nota al lead de Pedro: interesado en plan Pro',
    ];

    res.json({ success: true, data: baseSuggestions });
  } catch (error) {
    logger.error('IA suggestions error:', error);
    res.status(500).json({ error: 'Error obteniendo sugerencias' });
  }
});

// ===== Action Endpoints =====

// GET /api/ia/actions/pending - Listar acciones pendientes del usuario
router.get('/actions/pending', async (req: Request, res: Response) => {
  try {
    const actions = await getPendingActions(req.user!.userId);
    res.json({ success: true, data: actions });
  } catch (error) {
    logger.error('IA pending actions error:', error);
    res.status(500).json({ error: 'Error obteniendo acciones pendientes' });
  }
});

// GET /api/ia/actions - Listar todas las acciones del usuario (con filtros y paginacion)
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const options = {
      estado: req.query.estado as string | undefined,
      tipo: req.query.tipo as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };
    const result = await getActions(req.user!.userId, options);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('IA actions list error:', error);
    res.status(500).json({ error: 'Error obteniendo acciones' });
  }
});

// POST /api/ia/actions/:id/confirm - Confirmar y ejecutar una acción propuesta
router.post('/actions/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await executeAction(id, req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('IA action confirm error:', error);
    res.status(500).json({ error: error.message || 'Error ejecutando la acción' });
  }
});

// POST /api/ia/actions/:id/cancel - Cancelar una acción propuesta
router.post('/actions/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await cancelAction(id, req.user!.userId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('IA action cancel error:', error);
    res.status(500).json({ error: error.message || 'Error cancelando la acción' });
  }
});

export default router;
