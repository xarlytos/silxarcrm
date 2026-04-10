import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/calendario/events - Obtener eventos por rango de fechas
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { inicio, fin, asignadoA } = req.query;

    if (!inicio || !fin) {
      res.status(400).json({ error: 'Parámetros inicio y fin son requeridos' });
      return;
    }

    const where: any = {
      fechaInicio: {
        gte: new Date(inicio as string),
        lte: new Date(fin as string),
      },
    };

    if (asignadoA && asignadoA !== 'todos') {
      where.OR = [
        { asignadoA: asignadoA as string },
        { asignadoA: 'ambos' }
      ];
    }

    const eventos = await prisma.calendarioEvento.findMany({
      where,
      orderBy: { fechaInicio: 'asc' },
    });

    res.json({ success: true, data: eventos });
  } catch (error) {
    logger.error('Error obteniendo eventos del calendario:', error);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
});

// GET /api/calendario/events/:id - Obtener un evento específico
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const evento = await prisma.calendarioEvento.findUnique({
      where: { id },
    });

    if (!evento) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }

    res.json({ success: true, data: evento });
  } catch (error) {
    logger.error('Error obteniendo evento:', error);
    res.status(500).json({ error: 'Error obteniendo evento' });
  }
});

// POST /api/calendario/events - Crear nuevo evento
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { titulo, descripcion, fechaInicio, fechaFin, todoElDia, asignadoA, color } = req.body;
    const usuario = (req as any).user;

    // Validaciones
    if (!titulo || !fechaInicio || !asignadoA) {
      res.status(400).json({ error: 'Título, fecha de inicio y asignación son requeridos' });
      return;
    }

    if (!['carlos', 'silviu', 'ambos'].includes(asignadoA)) {
      res.status(400).json({ error: 'Asignación debe ser: carlos, silviu o ambos' });
      return;
    }

    const evento = await prisma.calendarioEvento.create({
      data: {
        titulo,
        descripcion: descripcion || '',
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : new Date(fechaInicio),
        todoElDia: todoElDia || false,
        asignadoA,
        color: color || 'blue',
        creadoPor: usuario?.nombre || 'sistema',
      },
    });

    logger.info(`Evento de calendario creado: ${evento.id} por ${usuario?.nombre}`);
    res.status(201).json({ success: true, data: evento });
  } catch (error) {
    logger.error('Error creando evento:', error);
    res.status(500).json({ error: 'Error creando evento' });
  }
});

// PUT /api/calendario/events/:id - Actualizar evento
router.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, fechaInicio, fechaFin, todoElDia, asignadoA, color, completado } = req.body;

    const eventoExistente = await prisma.calendarioEvento.findUnique({
      where: { id },
    });

    if (!eventoExistente) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }

    const updateData: any = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (fechaInicio !== undefined) updateData.fechaInicio = new Date(fechaInicio);
    if (fechaFin !== undefined) updateData.fechaFin = new Date(fechaFin);
    if (todoElDia !== undefined) updateData.todoElDia = todoElDia;
    if (asignadoA !== undefined) updateData.asignadoA = asignadoA;
    if (color !== undefined) updateData.color = color;
    if (completado !== undefined) updateData.completado = completado;

    const evento = await prisma.calendarioEvento.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: evento });
  } catch (error) {
    logger.error('Error actualizando evento:', error);
    res.status(500).json({ error: 'Error actualizando evento' });
  }
});

// DELETE /api/calendario/events/:id - Eliminar evento
router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const eventoExistente = await prisma.calendarioEvento.findUnique({
      where: { id },
    });

    if (!eventoExistente) {
      res.status(404).json({ error: 'Evento no encontrado' });
      return;
    }

    await prisma.calendarioEvento.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Evento eliminado' });
  } catch (error) {
    logger.error('Error eliminando evento:', error);
    res.status(500).json({ error: 'Error eliminando evento' });
  }
});

// GET /api/calendario/stats - Estadísticas del calendario
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const [hoyCount, pendientesCarlos, pendientesSilviu, completados] = await Promise.all([
      // Eventos hoy
      prisma.calendarioEvento.count({
        where: {
          fechaInicio: {
            gte: hoy,
            lt: manana,
          },
        },
      }),
      // Pendientes Carlos
      prisma.calendarioEvento.count({
        where: {
          completado: false,
          OR: [{ asignadoA: 'carlos' }, { asignadoA: 'ambos' }],
          fechaInicio: { gte: hoy },
        },
      }),
      // Pendientes Silviu
      prisma.calendarioEvento.count({
        where: {
          completado: false,
          OR: [{ asignadoA: 'silviu' }, { asignadoA: 'ambos' }],
          fechaInicio: { gte: hoy },
        },
      }),
      // Completados este mes
      prisma.calendarioEvento.count({
        where: {
          completado: true,
          fechaInicio: {
            gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        hoy: hoyCount,
        pendientesCarlos,
        pendientesSilviu,
        completadosEsteMes: completados,
      },
    });
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

export default router;
