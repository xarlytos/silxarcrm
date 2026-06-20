import { PrismaClient } from '@prisma/client';
import { openai } from '../../config/openai';

const prisma = new PrismaClient();

interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  brandId?: string;
  platform?: string;
}

function buildWhere(softwareId: string, filters: AnalyticsFilters) {
  const where: any = {
    account: { softwareId },
    status: 'PUBLISHED',
  };
  if (filters.brandId) where.account = { ...where.account, brandId: filters.brandId };
  if (filters.platform) where.account = { ...where.account, platform: filters.platform };
  if (filters.startDate || filters.endDate) {
    where.publishedAt = {};
    if (filters.startDate) where.publishedAt.gte = filters.startDate;
    if (filters.endDate) where.publishedAt.lte = filters.endDate;
  }
  return where;
}

export async function getSocialAnalytics(softwareId: string, filters: AnalyticsFilters = {}) {
  const where = buildWhere(softwareId, filters);

  const posts = await prisma.socialAccountPost.findMany({
    where,
    include: { account: { select: { nombre: true, platform: true, followersCount: true } } },
    orderBy: { publishedAt: 'asc' },
  });

  const totalPosts = posts.length;
  const totals = posts.reduce(
    (acc, p) => {
      acc.reach += p.reach;
      acc.impressions += p.impressions;
      acc.likes += p.likes;
      acc.comments += p.comments;
      acc.shares += p.shares;
      acc.clicks += p.clicks;
      acc.engagement += p.engagement || p.likes + p.comments + p.shares;
      return acc;
    },
    { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagement: 0 }
  );

  const avgEngagementRate =
    totals.impressions > 0 ? (totals.engagement / totals.impressions) * 100 : 0;

  // Engagement over time (por día)
  const timeMap: Record<string, { engagement: number; reach: number; posts: number }> = {};
  for (const p of posts) {
    if (!p.publishedAt) continue;
    const key = p.publishedAt.toISOString().slice(0, 10);
    if (!timeMap[key]) timeMap[key] = { engagement: 0, reach: 0, posts: 0 };
    timeMap[key].engagement += p.engagement || p.likes + p.comments + p.shares;
    timeMap[key].reach += p.reach;
    timeMap[key].posts += 1;
  }
  const engagementOverTime = Object.entries(timeMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Por plataforma
  const platformMap: Record<string, { posts: number; engagement: number; reach: number }> = {};
  for (const p of posts) {
    const plat = p.account?.platform || 'OTHER';
    if (!platformMap[plat]) platformMap[plat] = { posts: 0, engagement: 0, reach: 0 };
    platformMap[plat].posts += 1;
    platformMap[plat].engagement += p.engagement || p.likes + p.comments + p.shares;
    platformMap[plat].reach += p.reach;
  }
  const byPlatform = Object.entries(platformMap).map(([platform, v]) => ({ platform, ...v }));

  // Por tipo de contenido (formato)
  const formatMap: Record<string, { posts: number; engagement: number }> = {};
  for (const p of posts) {
    const fmt = p.formato || 'feed';
    if (!formatMap[fmt]) formatMap[fmt] = { posts: 0, engagement: 0 };
    formatMap[fmt].posts += 1;
    formatMap[fmt].engagement += p.engagement || p.likes + p.comments + p.shares;
  }
  const byContentType = Object.entries(formatMap)
    .map(([formato, v]) => ({ formato, posts: v.posts, avgEngagement: v.posts ? v.engagement / v.posts : 0 }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Top / worst posts
  const scored = posts
    .map((p) => ({
      id: p.id,
      title: p.title || p.content?.slice(0, 60) || 'Sin título',
      platform: p.account?.platform || null,
      accountName: p.account?.nombre || null,
      engagement: p.engagement || p.likes + p.comments + p.shares,
      reach: p.reach,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      publishedAt: p.publishedAt,
    }))
    .sort((a, b) => b.engagement - a.engagement);

  return {
    kpis: {
      totalPosts,
      totalReach: totals.reach,
      totalImpressions: totals.impressions,
      totalEngagement: totals.engagement,
      avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
      totalLikes: totals.likes,
      totalComments: totals.comments,
      totalShares: totals.shares,
      totalClicks: totals.clicks,
    },
    topPost: scored[0] || null,
    engagementOverTime,
    byPlatform,
    byContentType,
    topPosts: scored.slice(0, 5),
    worstPosts: scored.slice(-5).reverse().filter((p) => !scored.slice(0, 5).some((t) => t.id === p.id)),
  };
}

// Snapshot: persiste las métricas actuales de los posts publicados en SocialPostMetric (hoy)
export async function snapshotMetrics(softwareId: string) {
  const posts = await prisma.socialAccountPost.findMany({
    where: { account: { softwareId }, status: 'PUBLISHED' },
    select: { id: true, impressions: true, reach: true, likes: true, comments: true, shares: true, clicks: true, engagement: true },
  });

  const hoy = new Date();
  const fecha = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));

  let count = 0;
  for (const p of posts) {
    const engagementRate = p.impressions > 0 ? (p.engagement / p.impressions) * 100 : 0;
    const ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
    await prisma.socialPostMetric.upsert({
      where: { postId_fecha: { postId: p.id, fecha } },
      update: {
        impressions: p.impressions, reach: p.reach, likes: p.likes, comments: p.comments,
        shares: p.shares, clicks: p.clicks, engagementRate, ctr, fetchedAt: new Date(),
      },
      create: {
        postId: p.id, fecha, impressions: p.impressions, reach: p.reach, likes: p.likes,
        comments: p.comments, shares: p.shares, clicks: p.clicks, engagementRate, ctr, fetchedAt: new Date(),
      },
    });
    count++;
  }
  return { snapshotted: count, fecha };
}

// Genera un reporte con resumen ejecutivo por IA
export async function generateReport(softwareId: string, filters: AnalyticsFilters = {}) {
  const analytics = await getSocialAnalytics(softwareId, filters);

  let resumenEjecutivo = '';
  try {
    const prompt = `Eres un analista de social media. Genera un resumen ejecutivo en español (3-4 párrafos, tono profesional y directo) a partir de estos datos del periodo:
${JSON.stringify(analytics.kpis)}
Top plataformas: ${JSON.stringify(analytics.byPlatform)}
Mejores formatos: ${JSON.stringify(analytics.byContentType.slice(0, 3))}
Post destacado: ${analytics.topPost ? analytics.topPost.title : 'N/A'}
Incluye: rendimiento general, qué funcionó mejor, y 2-3 recomendaciones accionables.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.7,
    });
    resumenEjecutivo = response.choices[0]?.message?.content || '';
  } catch (e: any) {
    resumenEjecutivo = `No se pudo generar el resumen con IA (${e.message}). Resumen automático: se publicaron ${analytics.kpis.totalPosts} posts con un alcance total de ${analytics.kpis.totalReach} y ${analytics.kpis.totalEngagement} interacciones (engagement rate medio ${analytics.kpis.avgEngagementRate}%).`;
  }

  return { ...analytics, resumenEjecutivo, generatedAt: new Date() };
}

export default { getSocialAnalytics, snapshotMetrics, generateReport };
