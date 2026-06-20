import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calcula métricas diarias del Growth Engine para un software
 */
export async function calculateDailyMetrics(softwareId: string, date?: Date) {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  // Leads por fuente
  const leadsBySource = await prisma.lead.groupBy({
    by: ['origen'],
    where: {
      softwareId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    _count: { id: true },
  });

  // Contenido publicado hoy
  const publishedContent = await prisma.contentPiece.findMany({
    where: {
      softwareId,
      status: 'PUBLISHED',
      publishedAt: { gte: startOfDay, lte: endOfDay },
    },
  });

  // Agregar métricas de redes sociales (simulado — en producción se saca de APIs)
  const socialContent = publishedContent.filter((c) => c.type === 'POST');
  const seoContent = publishedContent.filter((c) =>
    ['ARTICLE', 'FAQ', 'CASE_STUDY', 'COMPARISON', 'LANDING_PAGE'].includes(c.type)
  );

  const totalImpressions = socialContent.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = socialContent.reduce((sum, c) => sum + c.clicks, 0);

  // Mapear leads por canal
  const socialLeads = leadsBySource
    .filter((l) => l.origen?.includes('social') || l.origen?.includes('linkedin') || l.origen?.includes('facebook'))
    .reduce((sum, l) => sum + l._count.id, 0);

  const seoLeads = leadsBySource
    .filter((l) => l.origen?.includes('seo') || l.origen?.includes('blog') || l.origen?.includes('organic'))
    .reduce((sum, l) => sum + l._count.id, 0);

  const videoLeads = leadsBySource
    .filter((l) => l.origen?.includes('video') || l.origen?.includes('tiktok') || l.origen?.includes('youtube'))
    .reduce((sum, l) => sum + l._count.id, 0);

  const referralLeads = leadsBySource
    .filter((l) => l.origen?.includes('referral') || l.origen?.includes('referido'))
    .reduce((sum, l) => sum + l._count.id, 0);

  const marketplaceLeads = leadsBySource
    .filter((l) => l.origen?.includes('marketplace'))
    .reduce((sum, l) => sum + l._count.id, 0);

  const totalLeads = socialLeads + seoLeads + videoLeads + referralLeads + marketplaceLeads;

  // Upsert métricas
  const metrics = await prisma.growthMetric.upsert({
    where: {
      softwareId_date: {
        softwareId,
        date: startOfDay,
      },
    },
    update: {
      impressions: totalImpressions,
      clicks: totalClicks,
      leads: totalLeads,
      socialLeads,
      seoLeads,
      videoLeads,
      referralLeads,
      marketplaceLeads,
    },
    create: {
      softwareId,
      date: startOfDay,
      impressions: totalImpressions,
      clicks: totalClicks,
      leads: totalLeads,
      socialLeads,
      seoLeads,
      videoLeads,
      referralLeads,
      marketplaceLeads,
    },
  });

  return metrics;
}

/**
 * Obtiene métricas acumuladas por rango de fechas
 */
export async function getMetricsRange(
  softwareId: string,
  startDate: Date,
  endDate: Date
) {
  const metrics = await prisma.growthMetric.findMany({
    where: {
      softwareId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  // Totales
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      leads: acc.leads + m.leads,
      demos: acc.demos + m.demos,
      customers: acc.customers + m.customers,
      socialLeads: acc.socialLeads + m.socialLeads,
      seoLeads: acc.seoLeads + m.seoLeads,
      videoLeads: acc.videoLeads + m.videoLeads,
      referralLeads: acc.referralLeads + m.referralLeads,
      marketplaceLeads: acc.marketplaceLeads + m.marketplaceLeads,
      estimatedSpend: acc.estimatedSpend + m.estimatedSpend,
    }),
    {
      impressions: 0,
      clicks: 0,
      leads: 0,
      demos: 0,
      customers: 0,
      socialLeads: 0,
      seoLeads: 0,
      videoLeads: 0,
      referralLeads: 0,
      marketplaceLeads: 0,
      estimatedSpend: 0,
    }
  );

  // CTR promedio
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  // CAC estimado por canal
  const cacByChannel = {
    social: totals.socialLeads > 0 ? totals.estimatedSpend / totals.socialLeads : 0,
    seo: totals.seoLeads > 0 ? totals.estimatedSpend / totals.seoLeads : 0,
    video: totals.videoLeads > 0 ? totals.estimatedSpend / totals.videoLeads : 0,
    referral: totals.referralLeads > 0 ? totals.estimatedSpend / totals.referralLeads : 0,
    marketplace: totals.marketplaceLeads > 0 ? totals.estimatedSpend / totals.marketplaceLeads : 0,
  };

  return {
    daily: metrics,
    totals,
    avgCtr: Math.round(avgCtr * 100) / 100,
    cacByChannel,
    days: metrics.length,
  };
}

/**
 * Calcula métricas para todos los softwares
 */
export async function calculateAllMetrics() {
  const softwares = await prisma.software.findMany({
    where: { activo: true },
  });

  const results = await Promise.allSettled(
    softwares.map((s) => calculateDailyMetrics(s.id))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return { succeeded, failed, total: softwares.length };
}

export default {
  calculateDailyMetrics,
  getMetricsRange,
  calculateAllMetrics,
};
