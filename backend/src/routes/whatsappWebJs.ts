import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getEstadoWweb,
  listarClientes,
  iniciarCliente,
  detenerCliente,
  detenerTodos,
  enviarMensajeDirecto,
  enviarMensajeALead,
  enviarBulk,
  programarEnvio,
} from '../services/whatsappWebJsService';
import { prisma } from '../config/database';

const router = Router();
router.use(authMiddleware);

/* ============================================================
   Estado de todos los clientes o uno específico
============================================================ */

router.get('/estado', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string | undefined;
    if (softwareId) {
      const estado = getEstadoWweb(softwareId);
      res.json({ success: true, data: estado });
    } else {
      const todos = listarClientes();
      res.json({ success: true, data: todos });
    }
  } catch (error) {
    logger.error('WWeb estado error:', error);
    res.status(500).json({ error: 'Error obteniendo estado' });
  }
});

/* ============================================================
   Iniciar / Detener cliente por software
============================================================ */

router.post('/iniciar', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }

    const estadoPrevio = getEstadoWweb(softwareId);
    if (estadoPrevio.estado === 'listo' || estadoPrevio.estado === 'iniciando') {
      res.json({ success: true, data: estadoPrevio, message: 'Cliente ya iniciado' });
      return;
    }

    void iniciarCliente(softwareId).catch((err) => {
      logger.error(`[${softwareId}] WWeb iniciar error:`, err);
    });

    res.status(202).json({
      success: true,
      message: 'Cliente iniciándose. Consulta /estado?softwareId=xxx para ver el QR.',
    });
  } catch (error) {
    logger.error('WWeb iniciar error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/detener', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }

    await detenerCliente(softwareId);
    res.json({ success: true, message: `Cliente ${softwareId} detenido` });
  } catch (error) {
    logger.error('WWeb detener error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/detener-todos', async (_req: Request, res: Response) => {
  try {
    await detenerTodos();
    res.json({ success: true, message: 'Todos los clientes detenidos' });
  } catch (error) {
    logger.error('WWeb detener-todos error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/* ============================================================
   Enviar mensaje directo (a cualquier número)
============================================================ */

router.post('/enviar', async (req: Request, res: Response) => {
  try {
    const { softwareId, telefono, mensaje } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    if (!telefono?.trim() || !mensaje?.trim()) {
      res.status(400).json({ error: 'telefono y mensaje son obligatorios' });
      return;
    }

    const result = await enviarMensajeDirecto(softwareId, telefono, mensaje);
    res.json({ success: true, data: { enviado: result } });
  } catch (error) {
    logger.error('WWeb enviar error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

/* ============================================================
   Enviar mensaje a un lead del CRM
============================================================ */

router.post('/enviar-lead', async (req: Request, res: Response) => {
  try {
    const { softwareId, leadId, plantillaId, contenidoFinal } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    if (!leadId?.trim()) {
      res.status(400).json({ error: 'leadId obligatorio' });
      return;
    }

    const result = await enviarMensajeALead(softwareId, leadId, { plantillaId, contenidoFinal });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('WWeb enviar-lead error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

/* ============================================================
   Enviar en bulk (máximo 50 por petición)
============================================================ */

router.post('/enviar-bulk', async (req: Request, res: Response) => {
  try {
    const { softwareId, leadIds, mensaje } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ error: 'leadIds debe ser un array no vacío' });
      return;
    }
    if (leadIds.length > 50) {
      res.status(400).json({ error: 'Máximo 50 leads por petición' });
      return;
    }
    if (!mensaje?.trim()) {
      res.status(400).json({ error: 'mensaje obligatorio' });
      return;
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, telefono: true },
    });

    const result = await enviarBulk(softwareId, leads, mensaje);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('WWeb enviar-bulk error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

/* ============================================================
   Programar envío
============================================================ */

router.post('/programar', async (req: Request, res: Response) => {
  try {
    const { softwareId, leadId, plantillaId, contenidoFinal, programadoPara } = req.body;
    if (!softwareId?.trim()) {
      res.status(400).json({ error: 'softwareId obligatorio' });
      return;
    }
    if (!leadId?.trim()) {
      res.status(400).json({ error: 'leadId obligatorio' });
      return;
    }
    if (!programadoPara) {
      res.status(400).json({ error: 'programadoPara obligatorio' });
      return;
    }

    const fecha = new Date(programadoPara);
    if (isNaN(fecha.getTime()) || fecha <= new Date()) {
      res.status(400).json({ error: 'Fecha de programación inválida o en el pasado' });
      return;
    }

    const result = await programarEnvio(softwareId, leadId, {
      plantillaId,
      contenidoFinal,
      programadoPara: fecha,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    logger.error('WWeb programar error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
