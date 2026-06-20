import { randomBytes } from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

// ============================================================
// PORTAL DEL CLIENTE — "Sala de cristal"
// ------------------------------------------------------------
// Dashboard público por Brand (token, sin login) donde el cliente
// ve qué se está haciendo por él: contenido publicado con métricas,
// próximas publicaciones, y aprueba/rechaza con un click lo que
// está en revisión. Transparencia = retención + referidos.
// ============================================================

function newToken(): string {
  return randomBytes(24).toString('hex');
}

// ------------------------------------------------------------
// Gestión (auth, desde el dashboard)
// ------------------------------------------------------------

export async function enablePortal(brandId: string, regenerate = false) {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw new Error('Brand no encontrado');

  const token = regenerate || !brand.portalToken ? newToken() : brand.portalToken;

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data: { portalEnabled: true, portalToken: token },
    select: { id: true, nombre: true, portalEnabled: true, portalToken: true },
  });

  logger.info(`[Portal] Portal ${regenerate ? 'regenerado' : 'activado'} para brand ${brand.nombre}`);
  return updated;
}

export async function disablePortal(brandId: string) {
  return prisma.brand.update({
    where: { id: brandId },
    data: { portalEnabled: false },
    select: { id: true, portalEnabled: true },
  });
}

// ------------------------------------------------------------
// Vista pública
// ------------------------------------------------------------

async function brandByToken(token: string) {
  if (!token || token.length < 16) return null;
  return prisma.brand.findFirst({
    where: { portalToken: token, portalEnabled: true, activo: true },
  });
}

export async function getPortalData(token: string) {
  const brand = await brandByToken(token);
  if (!brand) return null;

  const accountIds = (
    await prisma.socialAccount.findMany({
      where: { brandId: brand.id },
      select: { id: true },
    })
  ).map((a) => a.id);

  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [pendientes, proximos, publicados, statsPublicados] = await Promise.all([
    // Pendiente de aprobación del cliente
    prisma.socialAccountPost.findMany({
      where: { accountId: { in: accountIds }, status: 'IN_REVIEW' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { account: { select: { nombre: true, platform: true, avatarUrl: true } } },
    }),
    // Próximas publicaciones
    prisma.socialAccountPost.findMany({
      where: { accountId: { in: accountIds }, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 15,
      include: { account: { select: { nombre: true, platform: true } } },
    }),
    // Últimos publicados con métricas
    prisma.socialAccountPost.findMany({
      where: { accountId: { in: accountIds }, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 15,
      include: { account: { select: { nombre: true, platform: true } } },
    }),
    // Agregados últimos 30 días
    prisma.socialAccountPost.aggregate({
      where: { accountId: { in: accountIds }, status: 'PUBLISHED', publishedAt: { gte: since30d } },
      _count: { id: true },
      _sum: { impressions: true, clicks: true, likes: true, shares: true, comments: true, reach: true },
    }),
  ]);

  // No filtrar PII del cliente aquí: el portal ES del cliente. Pero sí limpiar campos internos.
  const cleanPost = (p: any) => ({
    id: p.id,
    content: p.content,
    hashtags: p.hashtags,
    mediaUrls: p.mediaUrls,
    title: p.title,
    formato: p.formato,
    status: p.status,
    scheduledAt: p.scheduledAt,
    publishedAt: p.publishedAt,
    externalUrl: p.externalUrl,
    metrics: {
      impressions: p.impressions,
      clicks: p.clicks,
      likes: p.likes,
      shares: p.shares,
      comments: p.comments,
      reach: p.reach,
      engagement: p.engagement,
    },
    account: p.account,
    clientFeedback: (p.platformData as any)?.clientFeedback || null,
  });

  return {
    brand: {
      nombre: brand.nombre,
      logoUrl: brand.logoUrl,
      colorPrimario: brand.colorPrimario,
      descripcion: brand.descripcion,
      website: brand.website,
    },
    stats: {
      publicados30d: statsPublicados._count.id,
      impressions: statsPublicados._sum.impressions || 0,
      clicks: statsPublicados._sum.clicks || 0,
      interacciones:
        (statsPublicados._sum.likes || 0) +
        (statsPublicados._sum.shares || 0) +
        (statsPublicados._sum.comments || 0),
      reach: statsPublicados._sum.reach || 0,
      pendientesAprobacion: pendientes.length,
      programados: proximos.length,
    },
    pendientes: pendientes.map(cleanPost),
    proximos: proximos.map(cleanPost),
    publicados: publicados.map(cleanPost),
  };
}

// ------------------------------------------------------------
// Aprobación / rechazo del cliente (público con token)
// ------------------------------------------------------------

export async function reviewPost(
  token: string,
  postId: string,
  decision: 'approve' | 'reject',
  comentario?: string
) {
  const brand = await brandByToken(token);
  if (!brand) throw new Error('Portal no encontrado');

  // Verificar que el post pertenece a una cuenta de este brand y está en revisión
  const post = await prisma.socialAccountPost.findFirst({
    where: {
      id: postId,
      status: 'IN_REVIEW',
      account: { brandId: brand.id },
    },
  });
  if (!post) throw new Error('Contenido no encontrado o ya revisado');

  const platformData = (typeof post.platformData === 'object' && post.platformData !== null ? post.platformData : {}) as any;
  const feedbackEntry = {
    decision,
    comentario: comentario?.trim() || null,
    at: new Date().toISOString(),
    via: 'portal',
  };
  const clientFeedback = [...(Array.isArray(platformData.clientFeedback) ? platformData.clientFeedback : []), feedbackEntry];

  if (decision === 'approve') {
    const updated = await prisma.socialAccountPost.update({
      where: { id: post.id },
      data: {
        // Si ya tiene fecha pasa a la cola de publicación; si no, queda listo para programar
        status: post.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        approvedAt: new Date(),
        platformData: { ...platformData, clientFeedback },
      },
    });
    logger.info(`[Portal] Post ${post.id} aprobado por el cliente de ${brand.nombre}`);
    return { post: updated, decision };
  }

  const updated = await prisma.socialAccountPost.update({
    where: { id: post.id },
    data: {
      status: 'NEEDS_REVISION',
      platformData: { ...platformData, clientFeedback },
    },
  });
  logger.info(`[Portal] Post ${post.id} rechazado por el cliente de ${brand.nombre}${comentario ? ` ("${comentario.slice(0, 80)}")` : ''}`);
  return { post: updated, decision };
}

export default {
  enablePortal,
  disablePortal,
  getPortalData,
  reviewPost,
};
