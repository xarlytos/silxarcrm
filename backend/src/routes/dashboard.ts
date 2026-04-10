import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { getDashboardMetrics } from '../services/metricsService';
import { logger } from '../utils/logger';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/dashboard - Global metrics
router.get('/', async (req: Request, res: Response) => {
  try {
    const saas = req.query.saas as string | undefined;
    const metrics = await getDashboardMetrics(saas);
    res.json({ success: true, data: metrics });
  } catch (error) {
    logger.error('Dashboard metrics error:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// GET /api/dashboard/clientes - List clients with pagination
router.get('/clientes', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const saas = req.query.saas as string;
    const estado = req.query.estado as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (saas) where.origenSaas = saas;
    if (estado) where.estado = estado;

    const [clientes, total] = await Promise.all([
      prisma.clienteGlobal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fechaRegistro: 'desc' },
        include: {
          suscripciones: { where: { estado: { in: ['activa', 'trial'] } }, take: 1 },
          _count: { select: { pagos: true, eventos: true } },
        },
      }),
      prisma.clienteGlobal.count({ where }),
    ]);

    res.json({
      success: true,
      data: { clientes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error('Clients list error:', error);
    res.status(500).json({ error: 'Error obteniendo clientes' });
  }
});

// GET /api/dashboard/clientes/:id - Client detail
router.get('/clientes/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const cliente = await prisma.clienteGlobal.findUnique({
      where: { id },
      include: {
        suscripciones: { orderBy: { createdAt: 'desc' } },
        pagos: { orderBy: { fechaPago: 'desc' }, take: 50 },
        eventos: { orderBy: { fecha: 'desc' }, take: 50 },
      },
    });

    if (!cliente) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    res.json({ success: true, data: cliente });
  } catch (error) {
    logger.error('Client detail error:', error);
    res.status(500).json({ error: 'Error obteniendo cliente' });
  }
});

// GET /api/dashboard/eventos - Event feed
router.get('/eventos', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const saas = req.query.saas as string;
    const tipo = req.query.tipo as string;
    const severidad = req.query.severidad as string;

    const where: any = {};
    if (saas) where.saas = saas;
    if (tipo) where.tipo = tipo;
    if (severidad) where.severidad = severidad;

    const [eventos, total] = await Promise.all([
      prisma.evento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: { cliente: { select: { nombre: true, email: true } } },
      }),
      prisma.evento.count({ where }),
    ]);

    res.json({
      success: true,
      data: { eventos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    logger.error('Events list error:', error);
    res.status(500).json({ error: 'Error obteniendo eventos' });
  }
});

// GET /api/dashboard/metricas - Historical metrics
router.get('/metricas', async (req: Request, res: Response) => {
  try {
    const saas = req.query.saas as string;
    const days = parseInt(req.query.days as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = { fecha: { gte: startDate } };
    if (saas) where.saas = saas;

    const metricas = await prisma.metricaDiaria.findMany({
      where,
      orderBy: { fecha: 'asc' },
    });

    res.json({ success: true, data: metricas });
  } catch (error) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// GET /api/dashboard/saas - List configured SaaS
router.get('/saas', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.webhookConfig.findMany({
      select: { saas: true, activo: true, descripcion: true, updatedAt: true },
    });
    res.json({ success: true, data: configs });
  } catch (error) {
    logger.error('SaaS list error:', error);
    res.status(500).json({ error: 'Error obteniendo SaaS' });
  }
});

export default router;
