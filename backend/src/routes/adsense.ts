import { Router } from 'express';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import adContentService, { slugify } from '../services/adsense/adContentService';
import adPublisherService from '../services/adsense/adPublisherService';

const router = Router();

/** Normaliza un dominio: sin protocolo, minúsculas, sin barra final */
export function normalizeDomain(d: string): string {
  return (d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// ============================================================
// === SITIOS (auth) — cada sitio = 1 dominio ===
// ============================================================

router.get('/sites', authMiddleware, async (_req, res) => {
  try {
    const sites = await prisma.adSite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { articles: true, niches: true } } },
    });
    res.json({ sites });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sites/:id', authMiddleware, async (req, res) => {
  try {
    const site = await prisma.adSite.findUnique({
      where: { id: req.params.id },
      include: { niches: true, _count: { select: { articles: true } } },
    });
    if (!site) return res.status(404).json({ error: 'Sitio no encontrado' });
    res.json({ site });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sites', authMiddleware, async (req, res) => {
  try {
    const { nombre, domain, descripcion, tema, idioma, colorPrimario, adsenseClient, adsenseSlots, gaMeasurementId } = req.body;
    if (!nombre || !domain) return res.status(400).json({ error: 'nombre y domain son obligatorios' });

    const dom = normalizeDomain(domain);
    const exists = await prisma.adSite.findUnique({ where: { domain: dom } });
    if (exists) return res.status(409).json({ error: 'Ese dominio ya está registrado' });

    const site = await prisma.adSite.create({
      data: {
        nombre,
        domain: dom,
        descripcion: descripcion || null,
        tema: tema || null,
        idioma: idioma || 'es',
        colorPrimario: colorPrimario || '#4F46E5',
        adsenseClient: adsenseClient || null,
        adsenseSlots: adsenseSlots || null,
        gaMeasurementId: gaMeasurementId || null,
      },
    });
    res.json({ site });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sites/:id', authMiddleware, async (req, res) => {
  try {
    const b = req.body;
    const data: any = {};
    for (const k of ['nombre', 'descripcion', 'tema', 'idioma', 'colorPrimario', 'adsenseClient', 'adsenseSlots', 'gaMeasurementId', 'activo']) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.domain !== undefined) data.domain = normalizeDomain(b.domain);
    const site = await prisma.adSite.update({ where: { id: req.params.id }, data });
    res.json({ site });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sites/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.adSite.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === NICHOS (auth) — pertenecen a un sitio ===
// ============================================================

router.get('/niches', authMiddleware, async (req, res) => {
  try {
    const where: any = {};
    if (req.query.siteId) where.siteId = req.query.siteId as string;
    const niches = await prisma.adNiche.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { articles: true } } },
    });
    res.json({ niches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/niches', authMiddleware, async (req, res) => {
  try {
    const { siteId, nombre, descripcion, keywordsSemilla, cpcTier, idioma } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es obligatorio' });
    const niche = await prisma.adNiche.create({
      data: {
        siteId: siteId || null,
        nombre,
        slug: slugify(nombre) + '-' + Math.random().toString(36).slice(2, 6),
        descripcion: descripcion || null,
        keywordsSemilla: Array.isArray(keywordsSemilla) ? keywordsSemilla : [],
        cpcTier: cpcTier || 'medium',
        idioma: idioma || 'es',
      },
    });
    res.json({ niche });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/niches/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.adNiche.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === ARTÍCULOS (auth) ===
// ============================================================

router.get('/articles', authMiddleware, async (req, res) => {
  try {
    const { siteId, nicheId, status, limit = '20', offset = '0' } = req.query;
    const where: any = {};
    if (siteId) where.siteId = siteId as string;
    if (nicheId) where.nicheId = nicheId as string;
    if (status) where.status = status as string;

    const [articles, total] = await Promise.all([
      prisma.adArticle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: { niche: { select: { nombre: true } }, site: { select: { nombre: true, domain: true } } },
      }),
      prisma.adArticle.count({ where }),
    ]);
    res.json({ articles, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/articles/:id', authMiddleware, async (req, res) => {
  try {
    const article = await prisma.adArticle.findUnique({
      where: { id: req.params.id },
      include: { niche: true, site: true },
    });
    if (!article) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json({ article });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generar artículo para un sitio (nicheId opcional)
router.post('/articles/generate', authMiddleware, async (req, res) => {
  try {
    const { siteId, nicheId, keyword } = req.body;
    if (!siteId) return res.status(400).json({ error: 'siteId es obligatorio' });
    const article = await adContentService.generateArticle(siteId, nicheId, keyword);
    res.json({ article });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/articles/generate-batch', authMiddleware, async (req, res) => {
  try {
    const { siteId, count } = req.body;
    if (!siteId) return res.status(400).json({ error: 'siteId es obligatorio' });
    const articles = await adContentService.generateBatch(siteId, parseInt(count) || 3);
    res.json({ articles, generated: articles.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/articles/:id/publish', authMiddleware, async (req, res) => {
  try {
    res.json({ article: await adPublisherService.publish(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/articles/:id/unpublish', authMiddleware, async (req, res) => {
  try {
    res.json({ article: await adPublisherService.unpublish(req.params.id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/articles/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.adArticle.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (_req, res) => {
  try {
    const [sites, totalArticles, published, totalViews] = await Promise.all([
      prisma.adSite.count({ where: { activo: true } }),
      prisma.adArticle.count(),
      prisma.adArticle.count({ where: { status: 'PUBLISHED' } }),
      prisma.adArticle.aggregate({ _sum: { views: true } }),
    ]);
    res.json({ sites, totalArticles, published, drafts: totalArticles - published, totalViews: totalViews._sum.views || 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === PÚBLICO (sin auth) — resolución por dominio (host) ===
// ============================================================

/** Busca un sitio por dominio probando con y sin www */
async function findSiteByDomain(domain: string) {
  const dom = normalizeDomain(domain);
  const alt = dom.startsWith('www.') ? dom.slice(4) : `www.${dom}`;
  return prisma.adSite.findFirst({ where: { domain: { in: [dom, alt] }, activo: true } });
}

// Config del sitio para un dominio (branding + adsense)
router.get('/public/site', async (req, res) => {
  try {
    const site = await findSiteByDomain((req.query.domain as string) || '');
    if (!site) return res.status(404).json({ error: 'Sitio no encontrado' });
    const niches = await prisma.adNiche.findMany({
      where: { siteId: site.id, activo: true },
      select: { id: true, nombre: true, slug: true },
    });
    res.json({
      site: {
        id: site.id,
        nombre: site.nombre,
        domain: site.domain,
        descripcion: site.descripcion,
        tema: site.tema,
        logoUrl: site.logoUrl,
        colorPrimario: site.colorPrimario,
        adsenseClient: site.adsenseClient,
        adsenseSlots: site.adsenseSlots,
        gaMeasurementId: site.gaMeasurementId,
      },
      niches,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listado de artículos publicados de un dominio
router.get('/public/articles', async (req, res) => {
  try {
    const site = await findSiteByDomain((req.query.domain as string) || '');
    if (!site) return res.json({ articles: [] });
    const where: any = { siteId: site.id, status: 'PUBLISHED' };
    if (req.query.niche) where.niche = { slug: req.query.niche as string };

    const articles = await prisma.adArticle.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: parseInt((req.query.limit as string) || '30'),
      select: {
        id: true, title: true, slug: true, excerpt: true, coverImage: true, publishedAt: true,
        niche: { select: { nombre: true, slug: true } },
      },
    });
    res.json({ articles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Artículo por slug (los slugs son globalmente únicos)
router.get('/public/articles/:slug', async (req, res) => {
  try {
    const article = await prisma.adArticle.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: { niche: { select: { nombre: true, slug: true } }, site: { select: { domain: true, nombre: true } } },
    });
    if (!article) return res.status(404).json({ error: 'Artículo no encontrado' });
    prisma.adArticle.update({ where: { id: article.id }, data: { views: { increment: 1 } } }).catch(() => {});
    res.json({ article });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sitemap por dominio
router.get('/public/sitemap.xml', async (req, res) => {
  try {
    const xml = await adPublisherService.generateSitemap(normalizeDomain((req.query.domain as string) || ''));
    res.header('Content-Type', 'application/xml').send(xml);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
