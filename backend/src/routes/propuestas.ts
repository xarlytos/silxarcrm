import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { PropuestaEstado } from '@prisma/client';

const router = Router();

// Todas las rutas excepto la pública requieren auth
router.use(authMiddleware);

// Helper para calcular totales
function calcularTotales(items: Array<{ cantidad: number; precioUnitario: number }>) {
  const subtotal = items.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  const impuestos = subtotal * 0.21; // 21% IVA por defecto
  const total = subtotal + impuestos;
  return { subtotal, impuestos, total };
}

// GET /api/propuestas - Listar propuestas
router.get('/', async (req: Request, res: Response) => {
  try {
    const softwareId = req.query.softwareId as string | undefined;
    const estado = req.query.estado as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const where: any = { creadoPor: req.user!.userId };
    if (softwareId) where.softwareId = softwareId;
    if (estado && Object.values(PropuestaEstado).includes(estado as PropuestaEstado)) {
      where.estado = estado as PropuestaEstado;
    }

    const [propuestas, total] = await Promise.all([
      prisma.propuesta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.propuesta.count({ where }),
    ]);

    res.json({
      success: true,
      data: { propuestas, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error('Error listando propuestas:', error);
    res.status(500).json({ error: 'Error obteniendo propuestas' });
  }
});

// POST /api/propuestas - Crear propuesta
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      titulo,
      descripcion,
      leadId,
      clienteNombre,
      clienteEmail,
      items,
      condiciones,
      validezDias,
      softwareId,
    } = req.body;

    if (!titulo || !clienteNombre || !softwareId) {
      res.status(400).json({ error: 'Titulo, clienteNombre y softwareId son obligatorios' });
      return;
    }

    const itemsArray = Array.isArray(items) ? items : [];
    const { subtotal, impuestos, total } = calcularTotales(itemsArray);

    const propuesta = await prisma.propuesta.create({
      data: {
        titulo,
        descripcion: descripcion || null,
        leadId: leadId || null,
        clienteNombre,
        clienteEmail: clienteEmail || null,
        items: itemsArray as any,
        subtotal,
        impuestos,
        total,
        condiciones: condiciones || null,
        validezDias: validezDias || 30,
        creadoPor: req.user!.userId,
        softwareId,
      },
    });

    res.json({ success: true, data: propuesta });
  } catch (error) {
    logger.error('Error creando propuesta:', error);
    res.status(500).json({ error: 'Error creando propuesta' });
  }
});

// GET /api/propuestas/:id - Ver propuesta
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const propuesta = await prisma.propuesta.findUnique({
      where: { id: req.params.id },
    });

    if (!propuesta) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    res.json({ success: true, data: propuesta });
  } catch (error) {
    logger.error('Error obteniendo propuesta:', error);
    res.status(500).json({ error: 'Error obteniendo propuesta' });
  }
});

// PUT /api/propuestas/:id - Actualizar propuesta
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.propuesta.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    if (existing.estado !== PropuestaEstado.BORRADOR) {
      res.status(400).json({ error: 'Solo se pueden editar propuestas en estado borrador' });
      return;
    }

    const { titulo, descripcion, leadId, clienteNombre, clienteEmail, items, condiciones, validezDias } = req.body;

    let subtotal, impuestos, total;
    if (Array.isArray(items)) {
      const totals = calcularTotales(items);
      subtotal = totals.subtotal;
      impuestos = totals.impuestos;
      total = totals.total;
    }

    const propuesta = await prisma.propuesta.update({
      where: { id: req.params.id },
      data: {
        ...(titulo !== undefined && { titulo }),
        ...(descripcion !== undefined && { descripcion }),
        ...(leadId !== undefined && { leadId }),
        ...(clienteNombre !== undefined && { clienteNombre }),
        ...(clienteEmail !== undefined && { clienteEmail }),
        ...(items !== undefined && { items: items as any }),
        ...(subtotal !== undefined && { subtotal }),
        ...(impuestos !== undefined && { impuestos }),
        ...(total !== undefined && { total }),
        ...(condiciones !== undefined && { condiciones }),
        ...(validezDias !== undefined && { validezDias }),
      },
    });

    res.json({ success: true, data: propuesta });
  } catch (error) {
    logger.error('Error actualizando propuesta:', error);
    res.status(500).json({ error: 'Error actualizando propuesta' });
  }
});

// DELETE /api/propuestas/:id - Eliminar propuesta
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.propuesta.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error eliminando propuesta:', error);
    res.status(500).json({ error: 'Error eliminando propuesta' });
  }
});

// POST /api/propuestas/:id/enviar - Enviar propuesta
router.post('/:id/enviar', async (req: Request, res: Response) => {
  try {
    const propuesta = await prisma.propuesta.findUnique({ where: { id: req.params.id } });
    if (!propuesta) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    const updated = await prisma.propuesta.update({
      where: { id: req.params.id },
      data: {
        estado: PropuestaEstado.ENVIADA,
        enviadaAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error enviando propuesta:', error);
    res.status(500).json({ error: 'Error enviando propuesta' });
  }
});

// POST /api/propuestas/:id/duplicar - Duplicar propuesta
router.post('/:id/duplicar', async (req: Request, res: Response) => {
  try {
    const original = await prisma.propuesta.findUnique({ where: { id: req.params.id } });
    if (!original) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    const duplicada = await prisma.propuesta.create({
      data: {
        softwareId: original.softwareId,
        titulo: `${original.titulo} (copia)`,
        descripcion: original.descripcion,
        leadId: original.leadId,
        clienteNombre: original.clienteNombre,
        clienteEmail: original.clienteEmail,
        items: original.items as any,
        subtotal: original.subtotal,
        impuestos: original.impuestos,
        total: original.total,
        condiciones: original.condiciones,
        validezDias: original.validezDias,
        creadoPor: req.user!.userId,
      },
    });

    res.json({ success: true, data: duplicada });
  } catch (error) {
    logger.error('Error duplicando propuesta:', error);
    res.status(500).json({ error: 'Error duplicando propuesta' });
  }
});

// ===== PUBLIC ROUTES (no auth required) =====

// GET /api/propuestas/publica/:token - Ver propuesta pública
router.get('/publica/:token', async (req: Request, res: Response) => {
  try {
    const propuesta = await prisma.propuesta.findUnique({
      where: { urlToken: req.params.token },
    });

    if (!propuesta) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    if (propuesta.estado === PropuestaEstado.ENVIADA) {
      await prisma.propuesta.update({
        where: { id: propuesta.id },
        data: { estado: PropuestaEstado.VISTA, vistaAt: new Date() },
      });
    }

    // Check if expired
    const creada = new Date(propuesta.createdAt);
    const expira = new Date(creada.getTime() + propuesta.validezDias * 24 * 60 * 60 * 1000);
    const expirada = new Date() > expira;

    res.json({
      success: true,
      data: {
        ...propuesta,
        expirada,
        fechaExpiracion: expira.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error obteniendo propuesta pública:', error);
    res.status(500).json({ error: 'Error obteniendo propuesta' });
  }
});

// POST /api/propuestas/publica/:token/aceptar - Aceptar propuesta
router.post('/publica/:token/aceptar', async (req: Request, res: Response) => {
  try {
    const propuesta = await prisma.propuesta.findUnique({
      where: { urlToken: req.params.token },
    });

    if (!propuesta) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    if (propuesta.estado === PropuestaEstado.ACEPTADA) {
      res.status(400).json({ error: 'La propuesta ya fue aceptada' });
      return;
    }

    if (propuesta.estado === PropuestaEstado.RECHAZADA) {
      res.status(400).json({ error: 'La propuesta ya fue rechazada' });
      return;
    }

    const creada = new Date(propuesta.createdAt);
    const expira = new Date(creada.getTime() + propuesta.validezDias * 24 * 60 * 60 * 1000);
    if (new Date() > expira) {
      await prisma.propuesta.update({
        where: { id: propuesta.id },
        data: { estado: PropuestaEstado.EXPIRADA },
      });
      res.status(400).json({ error: 'La propuesta ha expirado' });
      return;
    }

    const updated = await prisma.propuesta.update({
      where: { id: propuesta.id },
      data: { estado: PropuestaEstado.ACEPTADA, aceptadaAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error aceptando propuesta:', error);
    res.status(500).json({ error: 'Error aceptando propuesta' });
  }
});

// POST /api/propuestas/publica/:token/rechazar - Rechazar propuesta
router.post('/publica/:token/rechazar', async (req: Request, res: Response) => {
  try {
    const { notas } = req.body;
    const propuesta = await prisma.propuesta.findUnique({
      where: { urlToken: req.params.token },
    });

    if (!propuesta) {
      res.status(404).json({ error: 'Propuesta no encontrada' });
      return;
    }

    if (propuesta.estado === PropuestaEstado.ACEPTADA) {
      res.status(400).json({ error: 'La propuesta ya fue aceptada' });
      return;
    }

    const updated = await prisma.propuesta.update({
      where: { id: propuesta.id },
      data: {
        estado: PropuestaEstado.RECHAZADA,
        rechazadaAt: new Date(),
        notasRechazo: notas || null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error rechazando propuesta:', error);
    res.status(500).json({ error: 'Error rechazando propuesta' });
  }
});

export default router;
