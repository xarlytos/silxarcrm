import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export async function calculateDailyMetrics(date: Date = new Date()): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all distinct SaaS
  const saasConfigs = await prisma.webhookConfig.findMany({ select: { saas: true } });

  for (const { saas } of saasConfigs) {
    try {
      const [
        nuevosRegistros,
        nuevosPagos,
        cancelaciones,
        upgrades,
        downgrades,
        clientesActivos,
        trialsActivos,
        trialsConvertidos,
        trialsExpirados,
        ingresos,
        ingresosPerdidos,
      ] = await Promise.all([
        prisma.clienteGlobal.count({
          where: { origenSaas: saas, fechaRegistro: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.pago.count({
          where: { suscripcion: { saas }, estado: 'completado', fechaPago: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.evento.count({
          where: { saas, tipo: 'cancelacion', fecha: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.evento.count({
          where: { saas, tipo: 'upgrade_plan', fecha: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.evento.count({
          where: { saas, tipo: 'downgrade_plan', fecha: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.suscripcion.count({
          where: { saas, estado: 'activa' },
        }),
        prisma.suscripcion.count({
          where: { saas, estado: 'trial' },
        }),
        prisma.evento.count({
          where: { saas, tipo: 'pago_exitoso', fecha: { gte: startOfDay, lte: endOfDay },
            cliente: { suscripciones: { some: { saas, diasTrialTotal: { not: null } } } } },
        }),
        prisma.evento.count({
          where: { saas, tipo: 'trial_expirado', fecha: { gte: startOfDay, lte: endOfDay } },
        }),
        prisma.pago.aggregate({
          where: { suscripcion: { saas }, estado: 'completado', fechaPago: { gte: startOfDay, lte: endOfDay } },
          _sum: { monto: true },
        }),
        prisma.suscripcion.aggregate({
          where: { saas, estado: 'cancelada', fechaCancelacion: { gte: startOfDay, lte: endOfDay } },
          _sum: { monto: true },
        }),
      ]);

      // Calculate MRR
      const mrrResult = await prisma.suscripcion.aggregate({
        where: { saas, estado: 'activa' },
        _sum: { monto: true },
      });
      const mrr = Number(mrrResult._sum.monto || 0);
      const arr = mrr * 12;

      // Calculate rates
      const totalClients = clientesActivos + trialsActivos;
      const churnRate = totalClients > 0 ? (cancelaciones / totalClients) * 100 : 0;
      const totalTrials = trialsActivos + trialsConvertidos + trialsExpirados;
      const trialToPaidRate = totalTrials > 0 ? (trialsConvertidos / totalTrials) * 100 : 0;

      await prisma.metricaDiaria.upsert({
        where: { fecha_saas: { fecha: startOfDay, saas } },
        update: {
          nuevosRegistros,
          nuevosPagos,
          cancelaciones,
          upgrades,
          downgrades,
          clientesActivos,
          trialsActivos,
          trialsConvertidos,
          trialsExpirados,
          mrr,
          arr,
          ingresosNuevos: Number(ingresos._sum.monto || 0),
          ingresosPerdidos: Number(ingresosPerdidos._sum.monto || 0),
          churnRate,
          trialToPaidRate,
        },
        create: {
          fecha: startOfDay,
          saas,
          nuevosRegistros,
          nuevosPagos,
          cancelaciones,
          upgrades,
          downgrades,
          clientesActivos,
          trialsActivos,
          trialsConvertidos,
          trialsExpirados,
          mrr,
          arr,
          ingresosNuevos: Number(ingresos._sum.monto || 0),
          ingresosPerdidos: Number(ingresosPerdidos._sum.monto || 0),
          churnRate,
          trialToPaidRate,
        },
      });

      logger.info(`Metrics calculated for ${saas} on ${startOfDay.toISOString().split('T')[0]}`);
    } catch (error) {
      logger.error(`Error calculating metrics for ${saas}:`, error);
    }
  }
}

export async function getDashboardMetrics(saas?: string) {
  const subsWhere: any = { estado: 'activa' };
  if (saas) subsWhere.saas = saas;

  const clientWhere: any = { estado: 'activo' };
  if (saas) clientWhere.origenSaas = saas;

  const eventWhere: any = {};
  if (saas) eventWhere.saas = saas;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    mrrResult,
    totalClients,
    totalTrials,
    cancelaciones30d,
    totalPagos,
    ingresos30d,
    recentEvents,
    saasList,
    recentPayments,
    topClients,
  ] = await Promise.all([
    // MRR from active subscriptions
    prisma.suscripcion.aggregate({
      where: subsWhere,
      _sum: { monto: true },
      _count: true,
    }),
    // Active clients
    prisma.clienteGlobal.count({ where: clientWhere }),
    // Active trials
    prisma.suscripcion.count({ where: { ...subsWhere, estado: 'trial' } }),
    // Cancellations last 30 days
    prisma.suscripcion.count({
      where: { ...(saas ? { saas } : {}), estado: 'cancelada', fechaCancelacion: { gte: thirtyDaysAgo } },
    }),
    // Total completed payments
    prisma.pago.count({
      where: { estado: 'completado', ...(saas ? { suscripcion: { saas } } : {}) },
    }),
    // Revenue last 30 days
    prisma.pago.aggregate({
      where: { estado: 'completado', fechaPago: { gte: thirtyDaysAgo }, ...(saas ? { suscripcion: { saas } } : {}) },
      _sum: { monto: true },
    }),
    // Recent events
    prisma.evento.findMany({
      where: eventWhere,
      orderBy: { fecha: 'desc' },
      take: 30,
      include: { cliente: { select: { id: true, nombre: true, email: true } } },
    }),
    // SaaS breakdown
    prisma.webhookConfig.findMany({ select: { saas: true, descripcion: true, activo: true } }),
    // Recent payments
    prisma.pago.findMany({
      where: { estado: 'completado', ...(saas ? { suscripcion: { saas } } : {}) },
      orderBy: { fechaPago: 'desc' },
      take: 10,
      include: {
        cliente: { select: { nombre: true, email: true } },
        suscripcion: { select: { saas: true, planTipo: true } },
      },
    }),
    // Top clients by payment amount
    prisma.clienteGlobal.findMany({
      where: clientWhere,
      orderBy: { fechaRegistro: 'desc' },
      take: 10,
      include: {
        suscripciones: { where: { estado: 'activa' }, take: 1 },
        _count: { select: { pagos: true } },
      },
    }),
  ]);

  const mrr = Number(mrrResult._sum.monto || 0);
  const activeSubs = mrrResult._count || 0;
  const churnRate = (totalClients + cancelaciones30d) > 0
    ? (cancelaciones30d / (totalClients + cancelaciones30d)) * 100
    : 0;

  // Per-SaaS breakdown
  const bySaas = await Promise.all(
    saasList.map(async (s) => {
      const saasMetrics = await prisma.suscripcion.aggregate({
        where: { saas: s.saas, estado: 'activa' },
        _sum: { monto: true },
        _count: true,
      });
      const saasClients = await prisma.clienteGlobal.count({
        where: { origenSaas: s.saas, estado: 'activo' },
      });
      return {
        saas: s.saas,
        descripcion: s.descripcion,
        activo: s.activo,
        mrr: Number(saasMetrics._sum.monto || 0),
        suscripciones: saasMetrics._count || 0,
        clientes: saasClients,
      };
    })
  );

  return {
    kpis: {
      mrr,
      arr: mrr * 12,
      totalClients,
      activeSubs,
      totalTrials,
      cancelaciones30d,
      churnRate,
      totalPagos,
      ingresos30d: Number(ingresos30d._sum.monto || 0),
    },
    bySaas,
    recentEvents,
    recentPayments,
    topClients,
  };
}
