import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  listSenders,
  createSender,
  updateSender,
  deleteSender,
  listPlantillas,
  getPlantilla,
  createPlantilla,
  updatePlantilla,
  deletePlantilla,
  sendOne,
  renderTemplate,
  contextFromLead,
  verifyUnsubscribeToken,
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../services/emailService';
import {
  listCampanas,
  getCampana,
  createCampana,
  cancelarCampana,
  lanzarCampana,
  previewAudiencia,
  listEnviosByCampana,
  promoverGanadora,
} from '../services/campanaService';
import { verifyResendSignature, processResendEvent } from '../services/webhookEmailService';
import { prisma } from '../config/database';

const router = Router();

// ============= ACCOUNTS =============

router.get('/accounts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const accounts = await listAccounts(req.query.softwareId as string | undefined);
    res.json({ success: true, data: accounts });
  } catch (error) {
    logger.error('List accounts error:', error);
    res.status(500).json({ error: 'Error listando cuentas' });
  }
});

router.post('/accounts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { softwareId, proveedor, nombre, apiKey, cuotaMax } = req.body;
    if (!softwareId || !nombre || !apiKey) {
      res.status(400).json({ error: 'softwareId, nombre y apiKey son obligatorios' });
      return;
    }
    const account = await createAccount({ softwareId, proveedor, nombre, apiKey, cuotaMax });
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    logger.error('Create account error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una cuenta con ese nombre para ese software' });
      return;
    }
    res.status(400).json({ error: (error as Error).message || 'Error creando cuenta' });
  }
});

router.put('/accounts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const account = await updateAccount(req.params.id, req.body);
    res.json({ success: true, data: account });
  } catch (error) {
    logger.error('Update account error:', error);
    res.status(500).json({ error: 'Error actualizando cuenta' });
  }
});

router.delete('/accounts/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await deleteAccount(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete account error:', error);
    if ((error as any).code === 'P2003') {
      res.status(409).json({ error: 'La cuenta tiene senders enlazados — primero desenlázalos o eliminalos' });
      return;
    }
    res.status(500).json({ error: 'Error eliminando cuenta' });
  }
});

// ============= SENDERS =============

router.get('/senders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const senders = await listSenders(req.query.softwareId as string | undefined);
    res.json({ success: true, data: senders });
  } catch (error) {
    logger.error('List senders error:', error);
    res.status(500).json({ error: 'Error listando senders' });
  }
});

router.post('/senders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { softwareId, email, nombre, esDefault, accountId } = req.body;
    if (!softwareId || !email || !nombre) {
      res.status(400).json({ error: 'softwareId, email y nombre son obligatorios' });
      return;
    }
    const sender = await createSender({ softwareId, email, nombre, esDefault, accountId });
    res.status(201).json({ success: true, data: sender });
  } catch (error) {
    logger.error('Create sender error:', error);
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un sender con ese email para ese software' });
      return;
    }
    res.status(500).json({ error: 'Error creando sender' });
  }
});

router.put('/senders/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sender = await updateSender(req.params.id, req.body);
    if (!sender) {
      res.status(404).json({ error: 'Sender no encontrado' });
      return;
    }
    res.json({ success: true, data: sender });
  } catch (error) {
    logger.error('Update sender error:', error);
    res.status(500).json({ error: 'Error actualizando sender' });
  }
});

router.delete('/senders/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await deleteSender(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete sender error:', error);
    if ((error as any).code === 'P2003') {
      res.status(409).json({ error: 'El sender tiene envíos asociados — desactívalo en vez de eliminarlo' });
      return;
    }
    res.status(500).json({ error: 'Error eliminando sender' });
  }
});

// ============= PLANTILLAS =============

router.get('/plantillas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const plantillas = await listPlantillas(
      req.query.softwareId as string | undefined,
      req.query.tipo as string | undefined
    );
    res.json({ success: true, data: plantillas });
  } catch (error) {
    logger.error('List plantillas error:', error);
    res.status(500).json({ error: 'Error listando plantillas' });
  }
});

router.get('/plantillas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const plantilla = await getPlantilla(req.params.id);
    if (!plantilla) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    res.json({ success: true, data: plantilla });
  } catch (error) {
    logger.error('Get plantilla error:', error);
    res.status(500).json({ error: 'Error obteniendo plantilla' });
  }
});

router.post('/plantillas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { softwareId, nombre, asunto, cuerpoHtml, cuerpoTexto, variables, tipo } = req.body;
    if (!softwareId || !nombre || !asunto || !cuerpoHtml) {
      res.status(400).json({ error: 'softwareId, nombre, asunto y cuerpoHtml son obligatorios' });
      return;
    }
    const plantilla = await createPlantilla({ softwareId, nombre, asunto, cuerpoHtml, cuerpoTexto, variables, tipo });
    res.status(201).json({ success: true, data: plantilla });
  } catch (error) {
    logger.error('Create plantilla error:', error);
    res.status(500).json({ error: 'Error creando plantilla' });
  }
});

router.put('/plantillas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tipo, nombre, asunto, cuerpoHtml, cuerpoTexto, variables } = req.body;
    const plantilla = await updatePlantilla(req.params.id, { tipo, nombre, asunto, cuerpoHtml, cuerpoTexto, variables });
    res.json({ success: true, data: plantilla });
  } catch (error) {
    logger.error('Update plantilla error:', error);
    res.status(500).json({ error: 'Error actualizando plantilla' });
  }
});

router.delete('/plantillas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await deletePlantilla(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete plantilla error:', error);
    res.status(500).json({ error: 'Error eliminando plantilla' });
  }
});

// ============= ENVÍO DE PRUEBA / 1-A-1 =============

router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { senderId, destinatario, asunto, cuerpoHtml, leadId, softwareId, plantillaId } = req.body;
    if (!senderId || !destinatario || !softwareId || (!cuerpoHtml && !plantillaId)) {
      res.status(400).json({ error: 'senderId, destinatario, softwareId y (cuerpoHtml o plantillaId) son obligatorios' });
      return;
    }

    let finalAsunto = asunto;
    let finalHtml = cuerpoHtml;

    // Si viene plantilla + lead, renderizar
    if (plantillaId) {
      const tpl = await getPlantilla(plantillaId);
      if (!tpl) {
        res.status(404).json({ error: 'Plantilla no encontrada' });
        return;
      }
      const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null;
      const ctx = lead ? contextFromLead(lead) : {};
      finalAsunto = renderTemplate(asunto || tpl.asunto, ctx);
      finalHtml = renderTemplate(cuerpoHtml || tpl.cuerpoHtml, ctx);
    }

    const envio = await sendOne({
      senderId,
      destinatario,
      asunto: finalAsunto,
      cuerpoHtml: finalHtml,
      leadId,
      softwareId,
    });
    res.status(201).json({ success: true, data: envio });
  } catch (error) {
    logger.error('Send email error:', error);
    res.status(500).json({ error: (error as Error).message || 'Error enviando email' });
  }
});

// ============= HISTORIAL DE ENVÍOS =============

router.get('/envios', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { leadId, campanaId, estado, page = '1', limit = '25' } = req.query;
    const where: any = {};
    if (leadId) where.leadId = leadId as string;
    if (campanaId) where.campanaId = campanaId as string;
    if (estado) where.estado = estado as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [envios, total] = await Promise.all([
      prisma.emailEnvio.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { email: true, nombre: true } } },
      }),
      prisma.emailEnvio.count({ where }),
    ]);

    res.json({
      success: true,
      data: { envios, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    logger.error('List envios error:', error);
    res.status(500).json({ error: 'Error listando envíos' });
  }
});

// ============= CAMPAÑAS =============

router.get('/campanas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campanas = await listCampanas({
      softwareId: req.query.softwareId as string | undefined,
      estado: req.query.estado as string | undefined,
    });
    res.json({ success: true, data: campanas });
  } catch (error) {
    logger.error('List campanas error:', error);
    res.status(500).json({ error: 'Error listando campañas' });
  }
});

router.get('/campanas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campana = await getCampana(req.params.id);
    if (!campana) {
      res.status(404).json({ error: 'Campaña no encontrada' });
      return;
    }
    res.json({ success: true, data: campana });
  } catch (error) {
    logger.error('Get campana error:', error);
    res.status(500).json({ error: 'Error obteniendo campaña' });
  }
});

router.post('/campanas/preview', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { softwareId, estado, prioridad, origen } = req.body;
    if (!softwareId) {
      res.status(400).json({ error: 'softwareId es obligatorio' });
      return;
    }
    const result = await previewAudiencia({ softwareId, estado, prioridad, origen });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Preview audiencia error:', error);
    res.status(500).json({ error: 'Error generando preview' });
  }
});

router.post('/campanas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { softwareId, nombre, senderId, plantillaId, audiencia, programadaPara, variantes } = req.body;
    if (!softwareId || !nombre || !senderId || !plantillaId || !audiencia) {
      res.status(400).json({ error: 'softwareId, nombre, senderId, plantillaId y audiencia son obligatorios' });
      return;
    }
    const campana = await createCampana({
      softwareId,
      nombre,
      senderId,
      plantillaId,
      audiencia,
      programadaPara: programadaPara ? new Date(programadaPara) : null,
      creadoPor: req.user?.userId || null,
      variantes,
    });
    res.status(201).json({ success: true, data: campana });
  } catch (error) {
    logger.error('Create campana error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error creando campaña' });
  }
});

router.post('/campanas/:id/promover/:varianteId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campana = await promoverGanadora(req.params.id, req.params.varianteId);
    res.json({ success: true, data: campana });
  } catch (error) {
    logger.error('Promover ganadora error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error promoviendo ganadora' });
  }
});

router.post('/campanas/:id/enviar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campana = await lanzarCampana(req.params.id);
    res.json({ success: true, data: campana });
  } catch (error) {
    logger.error('Lanzar campana error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error lanzando campaña' });
  }
});

router.post('/campanas/:id/cancelar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const campana = await cancelarCampana(req.params.id);
    res.json({ success: true, data: campana });
  } catch (error) {
    logger.error('Cancelar campana error:', error);
    res.status(400).json({ error: (error as Error).message || 'Error cancelando campaña' });
  }
});

router.get('/campanas/:id/eventos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50');
    const tipo = req.query.tipo as string | undefined;
    const eventos = await prisma.emailEvento.findMany({
      where: {
        envio: { campanaId: req.params.id },
        ...(tipo ? { tipo } : {}),
      },
      orderBy: { fecha: 'desc' },
      take: limit,
      include: {
        envio: { select: { destinatario: true, asunto: true, leadId: true } },
      },
    });
    res.json({ success: true, data: eventos });
  } catch (error) {
    logger.error('List eventos campana error:', error);
    res.status(500).json({ error: 'Error listando eventos' });
  }
});

router.get('/campanas/:id/envios', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const estado = req.query.estado as string | undefined;
    const result = await listEnviosByCampana(req.params.id, page, limit, estado);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('List envios campana error:', error);
    res.status(500).json({ error: 'Error listando envíos' });
  }
});

// ============= WEBHOOK RESEND (público, verificado por firma) =============

/**
 * Endpoint público que recibe eventos de Resend.
 * Configurar en https://resend.com/webhooks apuntando a https://tu-dominio/api/email/webhook
 * con el secret RESEND_WEBHOOK_SECRET del .env.
 *
 * Devuelve 200 OK rápido para no triggear reintentos. Errores de procesamiento
 * se loggean pero no se devuelven al webhook (Resend reintentaría).
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody as string | undefined;
    if (!rawBody) {
      res.status(400).json({ error: 'Raw body no disponible' });
      return;
    }

    const verification = verifyResendSignature(rawBody, req.headers as any);
    if (!verification.ok) {
      logger.warn(`[webhook resend] rechazado: ${verification.error}`);
      res.status(401).json({ error: verification.error || 'Firma inválida' });
      return;
    }

    const event = req.body;
    if (!event || !event.type) {
      res.status(400).json({ error: 'Payload sin event.type' });
      return;
    }

    // Procesar async — devolvemos 200 inmediato para no bloquear a Resend
    setImmediate(() => {
      processResendEvent(event).catch((err) => logger.error('[webhook resend] processing error:', err));
    });

    res.json({ success: true, type: event.type });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// ============= UNSUBSCRIBE (público) =============

router.get('/baja', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) {
      res.status(400).json({ error: 'Token inválido o caducado' });
      return;
    }
    res.json({ success: true, data: { email: decoded.email, softwareId: decoded.softwareId } });
  } catch (error) {
    res.status(400).json({ error: 'Token inválido' });
  }
});

// ============= ADMIN BAJAS =============

router.get('/bajas', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { softwareId, search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;
    if (search) where.email = { contains: search as string, mode: 'insensitive' };

    const [bajas, total, totalGlobal] = await Promise.all([
      prisma.emailBaja.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { fecha: 'desc' },
      }),
      prisma.emailBaja.count({ where }),
      prisma.emailBaja.count(),
    ]);

    res.json({
      success: true,
      data: {
        bajas,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
        totalGlobal,
      },
    });
  } catch (error) {
    logger.error('List bajas error:', error);
    res.status(500).json({ error: 'Error listando bajas' });
  }
});

router.delete('/bajas/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.emailBaja.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete baja error:', error);
    res.status(500).json({ error: 'Error restaurando contacto' });
  }
});

// ============= UNSUBSCRIBE — POST público =============

router.post('/baja', async (req: Request, res: Response) => {
  try {
    const { token, motivo } = req.body;
    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) {
      res.status(400).json({ error: 'Token inválido' });
      return;
    }
    await prisma.emailBaja.upsert({
      where: { email_softwareId: { email: decoded.email.toLowerCase(), softwareId: decoded.softwareId } },
      update: { motivo: motivo || null },
      create: {
        email: decoded.email.toLowerCase(),
        softwareId: decoded.softwareId,
        motivo: motivo || null,
        ipOrigen: req.ip,
      },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Error procesando baja' });
  }
});

export default router;
