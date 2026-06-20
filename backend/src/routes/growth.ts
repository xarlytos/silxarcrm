import { Router } from 'express';
import { PrismaClient, SocialPlatform, ContentType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import contentGenerator from '../services/growth/contentGenerator';
import socialPublisher from '../services/growth/socialPublisher';
import seoPublisher from '../services/growth/seoPublisher';
import videoGenerator from '../services/growth/videoGenerator';
import referralService from '../services/growth/referralService';
import marketplaceMonitorService from '../services/growth/marketplaceMonitorService';
import growthMetricsService from '../services/growth/growthMetricsService';
import activationService from '../services/growth/activationService';
import resurrectionService from '../services/growth/resurrectionService';
import radarService from '../services/growth/radarService';
import auditService from '../services/growth/auditService';
import portalService from '../services/growth/portalService';
import socialAnalyticsService from '../services/growth/socialAnalyticsService';
import caseStudyService from '../services/growth/caseStudyService';

const router = Router();
const prisma = new PrismaClient();

// --- Configuración ---

router.get('/config/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const config = await prisma.growthConfig.findUnique({
      where: { softwareId },
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // No devolver tokens en plain text
    const safeConfig = {
      ...config,
      linkedInToken: config.linkedInToken ? '***' : null,
      facebookToken: config.facebookToken ? '***' : null,
      instagramToken: config.instagramToken ? '***' : null,
      xToken: config.xToken ? '***' : null,
      tiktokToken: config.tiktokToken ? '***' : null,
      elevenLabsKey: config.elevenLabsKey ? '***' : null,
      searchConsoleJson: config.searchConsoleJson ? '***' : null,
    };

    res.json(safeConfig);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/config/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const data = req.body;

    const config = await prisma.growthConfig.upsert({
      where: { softwareId },
      update: data,
      create: { softwareId, ...data },
    });

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Contenido ---

router.get('/content', authMiddleware, async (req, res) => {
  try {
    const { softwareId, type, status, platform, limit = '20', offset = '0' } = req.query;

    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;
    if (type) where.type = type as string;
    if (status) where.status = status as string;
    if (platform) where.platform = platform as string;

    const [content, total] = await Promise.all([
      prisma.contentPiece.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: { software: { select: { nombre: true, slug: true } } },
      }),
      prisma.contentPiece.count({ where }),
    ]);

    res.json({ content, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content', authMiddleware, async (req, res) => {
  try {
    const { softwareId, title, body, type, platform } = req.body;

    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId es requerido' });
    }

    // Verificar que el software existe (en Software o webhookConfig)
    let software = await prisma.software.findUnique({
      where: { id: softwareId },
    });

    if (!software) {
      const webhook = await prisma.webhookConfig.findUnique({
        where: { saas: softwareId },
      });
      if (!webhook) {
        return res.status(400).json({ error: 'Software no encontrado' });
      }
      // Auto-crear software desde webhookConfig para satisfacer la FK
      software = await prisma.software.create({
        data: {
          id: webhook.saas,
          slug: webhook.saas,
          nombre: webhook.descripcion || webhook.saas,
          descripcion: webhook.descripcion || '',
        },
      });
    }

    const { coverImage } = req.body;
    const content = await prisma.contentPiece.create({
      data: {
        softwareId,
        title,
        body,
        type: type || 'ARTICLE',
        status: 'DRAFT',
        platform: platform || null,
        coverImage: coverImage || null,
      },
    });

    res.status(201).json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content/:id/generate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, platform, keyword, topic, count } = req.body;

    let result;

    switch (type) {
      case 'POST':
        result = await contentGenerator.generateSocialPosts({
          softwareId: id, // id es softwareId en este endpoint
          platform: platform as SocialPlatform,
          count: count || 5,
          topic,
        });
        break;

      case 'ARTICLE':
      case 'FAQ':
      case 'CASE_STUDY':
      case 'COMPARISON':
      case 'LANDING_PAGE':
        result = await contentGenerator.generateSeoContent({
          softwareId: id,
          keyword: keyword || topic,
          type: type as ContentType,
        });
        break;

      case 'VIDEO_SCRIPT':
        result = await contentGenerator.generateVideoScript({
          softwareId: id,
          topic: topic || keyword,
          duration: req.body.duration || 60,
        });
        break;

      default:
        return res.status(400).json({ error: 'Tipo de contenido no soportado' });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content/:id/schedule', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    const content = await prisma.contentPiece.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        scheduledAt: new Date(scheduledAt),
      },
    });

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content/:id/publish', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const content = await prisma.contentPiece.findUnique({
      where: { id },
      include: { software: { include: { growthConfig: true } } },
    });

    if (!content) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    if (content.type === 'POST' && content.platform) {
      // Publicar en red social
      const tokenMap: Record<string, string | null | undefined> = {
        LINKEDIN: content.software.growthConfig?.linkedInToken,
        FACEBOOK: content.software.growthConfig?.facebookToken,
        INSTAGRAM: content.software.growthConfig?.instagramToken,
        X: content.software.growthConfig?.xToken,
        TIKTOK: content.software.growthConfig?.tiktokToken,
      };

      const token = tokenMap[content.platform];
      if (!token) {
        return res.status(400).json({ error: `Token no configurado para ${content.platform}` });
      }

      const result = await socialPublisher.publishPost(content, token);
      res.json(result);
    } else if (['ARTICLE', 'FAQ', 'CASE_STUDY', 'COMPARISON', 'LANDING_PAGE'].includes(content.type)) {
      // Publicar contenido SEO
      const result = await seoPublisher.publishContent(content);
      res.json(result);
    } else if (content.type === 'VIDEO_SCRIPT') {
      // Generar video
      const result = await videoGenerator.generateVideoKit(
        content.softwareId,
        content.title,
        'hook_fact_cta',
        'profesional'
      );
      res.json(result);
    } else {
      res.status(400).json({ error: 'Tipo de contenido no soportado para publicación directa' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content/:id/regenerate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await contentGenerator.regenerateContent(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/content/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, excerpt, keywords, type, coverImage } = req.body;

    const content = await prisma.contentPiece.update({
      where: { id },
      data: {
        title,
        body,
        excerpt,
        keywords: keywords || [],
        type: type || undefined,
        coverImage: coverImage || null,
      },
    });

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/content/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contentPiece.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Calendario Editorial ---

router.get('/calendar', authMiddleware, async (req, res) => {
  try {
    const { softwareId, startDate, endDate } = req.query;

    const where: any = {
      status: { in: ['SCHEDULED', 'PUBLISHED'] },
    };

    if (softwareId) where.softwareId = softwareId as string;
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate as string);
      if (endDate) where.scheduledAt.lte = new Date(endDate as string);
    }

    const content = await prisma.contentPiece.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: { software: { select: { nombre: true, colorPrimario: true } } },
    });

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Métricas ---

router.get('/metrics', authMiddleware, async (req, res) => {
  try {
    const { softwareId, startDate, endDate } = req.query;

    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId requerido' });
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const metrics = await growthMetricsService.getMetricsRange(softwareId as string, start, end);

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/metrics/calculate', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.body;

    if (softwareId) {
      const metrics = await growthMetricsService.calculateDailyMetrics(softwareId);
      res.json(metrics);
    } else {
      const result = await growthMetricsService.calculateAllMetrics();
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Referidos ---

router.get('/referrals', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.query;

    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId requerido' });
    }

    const stats = await referralService.getReferralStats(softwareId as string);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/referrals', authMiddleware, async (req, res) => {
  try {
    const { clienteId, softwareId } = req.body;

    const result = await referralService.createReferralLink(clienteId, softwareId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/referrals/client/:clienteId', authMiddleware, async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { softwareId } = req.query;

    const referrals = await referralService.getClientReferrals(
      parseInt(clienteId),
      softwareId as string | undefined
    );

    res.json(referrals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/referrals/:code/track', async (req, res) => {
  try {
    const { code } = req.params;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const referral = await referralService.trackReferralClick(code, ip, userAgent);

    if (!referral) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Marketplaces ---

router.get('/marketplaces', authMiddleware, async (req, res) => {
  try {
    const { softwareId, marketplace, status, category } = req.query;

    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId requerido' });
    }

    const opportunities = await marketplaceMonitorService.getOpportunities(
      softwareId as string,
      {
        marketplace: marketplace as string | undefined,
        status: status as string | undefined,
        category: category as string | undefined,
      }
    );

    res.json(opportunities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/marketplaces/metrics', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.query;

    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId requerido' });
    }

    const metrics = await marketplaceMonitorService.getMarketplaceMetrics(softwareId as string);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/marketplaces/monitor', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.body;

    const count = await marketplaceMonitorService.monitorAll(softwareId);
    res.json({ opportunitiesFound: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/marketplaces/:id/convert', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, empresa } = req.body;

    const lead = await marketplaceMonitorService.convertOpportunityToLead(id, {
      nombre,
      email,
      telefono,
      empresa,
    });

    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Activación ---

router.get('/activation/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const config = await prisma.growthConfig.findUnique({
      where: { softwareId },
      select: {
        autoActivate: true,
        activationChannel: true,
      },
    });

    res.json(config || { autoActivate: true, activationChannel: 'email' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/activation/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const { autoActivate, activationChannel } = req.body;

    const config = await prisma.growthConfig.upsert({
      where: { softwareId },
      update: { autoActivate, activationChannel },
      create: {
        softwareId,
        autoActivate: autoActivate ?? true,
        activationChannel: activationChannel || 'email',
      },
    });

    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/activate/:leadId', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await activationService.activateLead(leadId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/activation/preview/:leadId', authMiddleware, async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await activationService.previewActivation(leadId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/activation/logs/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const { leadId, status, limit = '50' } = req.query;

    const where: any = {};
    if (leadId) {
      // Verificar que el lead pertenezca al software
      const lead = await prisma.lead.findFirst({
        where: { id: leadId as string, softwareId },
      });
      if (!lead) {
        return res.status(404).json({ error: 'Lead no encontrado en este software' });
      }
      where.leadId = leadId as string;
    } else {
      where.lead = { softwareId };
    }
    if (status) where.status = status as string;

    const logs = await prisma.activationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        lead: { select: { id: true, nombre: true, email: true, empresa: true } },
      },
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/activation/stats/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const stats = await activationService.getActivationStats(softwareId, days);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/activation/recent/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const leads = await activationService.getRecentActivatedLeads(softwareId, limit);
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/activation/process-pending', authMiddleware, async (req, res) => {
  try {
    const result = await activationService.processPendingActivations();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Inbound Lead (público) ---

router.post('/inbound-lead', async (req, res) => {
  try {
    const { nombre, email, telefono, empresa, cargo, pais, source, softwareId, metadata } = req.body;

    const result = await activationService.processInboundLead({
      nombre,
      email,
      telefono,
      empresa,
      cargo,
      pais,
      source: source || 'inbound',
      softwareId,
      metadata,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Casos de éxito automáticos (prueba social en piloto automático) ---

// Listado: case studies generados + hitos pendientes
router.get('/case-studies/:softwareId', authMiddleware, async (req, res) => {
  try {
    const result = await caseStudyService.listCaseStudies(req.params.softwareId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generar caso de éxito desde un lead convertido
router.post('/case-studies/generate', authMiddleware, async (req, res) => {
  try {
    const { leadId, softwareId, umbral } = req.body;
    if (leadId) {
      const piece = await caseStudyService.generateCaseStudyForLead(leadId);
      return res.status(201).json(piece);
    }
    if (softwareId && umbral) {
      const piece = await caseStudyService.generateMilestoneStory(softwareId, parseInt(umbral));
      return res.status(201).json(piece);
    }
    res.status(400).json({ error: 'Indica leadId, o softwareId + umbral' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resúmenes de casos publicados (munición para la IA de llamadas)
router.get('/case-studies/:softwareId/summaries', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const summaries = await caseStudyService.getPublishedSummaries(req.params.softwareId, limit);
    res.json(summaries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generación automática de borradores pendientes (manual o vía cron)
router.post('/case-studies/auto-generate', authMiddleware, async (req, res) => {
  try {
    const result = await caseStudyService.autoGenerateCaseStudies(req.body?.maxPorSoftware || 3);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Portal del cliente ("Sala de cristal") ---

// Activar / regenerar token del portal (auth)
router.post('/brands/:id/portal', authMiddleware, async (req, res) => {
  try {
    const regenerate = req.body?.regenerate === true;
    const result = await portalService.enablePortal(req.params.id, regenerate);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Desactivar portal (auth)
router.delete('/brands/:id/portal', authMiddleware, async (req, res) => {
  try {
    const result = await portalService.disablePortal(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vista del portal (público con token)
router.get('/portal/:token', async (req, res) => {
  try {
    const data = await portalService.getPortalData(req.params.token);
    if (!data) return res.status(404).json({ error: 'Portal no encontrado' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Aprobar / rechazar contenido (público con token)
router.post('/portal/:token/posts/:postId/review', async (req, res) => {
  try {
    const { decision, comentario } = req.body;
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ error: 'decision debe ser approve o reject' });
    }
    const result = await portalService.reviewPost(req.params.token, req.params.postId, decision, comentario);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Auditoría gratis (lead magnet público) ---

// Lanzar auditoría (público, sin auth — es el lead magnet)
router.post('/audit', async (req, res) => {
  try {
    const { softwareId, softwareSlug, negocio, url, nombre, email, telefono, ciudad } = req.body;

    // Resolver software por id o slug
    let resolvedId = softwareId as string | undefined;
    if (!resolvedId && softwareSlug) {
      const sw = await prisma.software.findUnique({ where: { slug: softwareSlug } });
      if (!sw) return res.status(404).json({ error: 'Software no encontrado' });
      resolvedId = sw.id;
    }
    if (!resolvedId) return res.status(400).json({ error: 'softwareId o softwareSlug requerido' });
    if (!negocio?.trim()) return res.status(400).json({ error: 'Indica el nombre de tu negocio o tu web' });

    const audit = await auditService.runAuditoria({
      softwareId: resolvedId,
      negocio,
      url,
      nombre,
      email,
      telefono,
      ciudad,
    });

    // Respuesta pública sin PII
    const { email: _e, telefono: _t, nombre: _n, ...publica } = audit as any;
    res.status(201).json(publica);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Ver informe (público — el id cuid hace de token)
router.get('/audit/:id', async (req, res) => {
  try {
    const audit = await auditService.getAuditoriaPublica(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Auditoría no encontrada' });
    res.json(audit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listado para el dashboard (auth)
router.get('/audits/:softwareId', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await auditService.listAuditorias(req.params.softwareId, limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Radar (cazador de leads automático por ICP) ---

router.get('/radar/:softwareId', authMiddleware, async (req, res) => {
  try {
    const summary = await radarService.getRadarSummary(req.params.softwareId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/radar/:softwareId', authMiddleware, async (req, res) => {
  try {
    const config = await radarService.updateConfig(req.params.softwareId, req.body);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/radar/:softwareId/run', authMiddleware, async (req, res) => {
  try {
    const dryRun = req.body?.dryRun === true;
    const result = await radarService.runRadar(req.params.softwareId, { trigger: 'manual', dryRun });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/radar/:softwareId/runs', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const runs = await radarService.getRuns(req.params.softwareId, limit);
    res.json(runs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Resurrección masiva (Cementerio → campaña de 1 click) ---

router.post('/resurrection/preview', authMiddleware, async (req, res) => {
  try {
    const { softwareId, ...opts } = req.body;
    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId requerido' });
    }
    const result = await resurrectionService.previewMassResurrection(softwareId, opts);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resurrection/launch', authMiddleware, async (req, res) => {
  try {
    const { softwareId, ...opts } = req.body;
    if (!softwareId) {
      return res.status(400).json({ error: 'softwareId requerido' });
    }
    const result = await resurrectionService.launchMassResurrection(softwareId, opts);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/resurrection/stats/:softwareId', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.params;
    const stats = await resurrectionService.getResurrectionStats(softwareId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Publicación programada (batch) ---

router.post('/publish-scheduled', authMiddleware, async (req, res) => {
  try {
    const result = await socialPublisher.publishScheduled();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Batch Generation ---

router.post('/generate-batch', authMiddleware, async (req, res) => {
  try {
    const { softwareId, options } = req.body;

    const result = await contentGenerator.generateContentBatch(softwareId, options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-multi', authMiddleware, async (req, res) => {
  try {
    const { softwareId, platforms, countPerPlatform, topic, tone } = req.body;

    const result = await contentGenerator.generateMultiPlatformPosts({
      softwareId,
      platforms,
      countPerPlatform: countPerPlatform || 5,
      topic,
      tone,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hashtags', authMiddleware, async (req, res) => {
  try {
    const { topic, nicho, count } = req.body;

    const hashtags = await contentGenerator.generateHashtags(
      topic,
      nicho,
      count || 10
    );

    res.json({ hashtags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content/:id/repurpose', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetPlatform } = req.body;

    const result = await contentGenerator.repurposePost(id, targetPlatform);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SEO Engine ---

router.post('/seo/batch', authMiddleware, async (req, res) => {
  try {
    const { softwareId, options } = req.body;

    const result = await contentGenerator.generateSeoBatch(softwareId, options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/seo/landing', authMiddleware, async (req, res) => {
  try {
    const { softwareId, baseKeyword, city } = req.body;

    const result = await contentGenerator.generateProgrammaticLanding(
      softwareId,
      baseKeyword,
      city
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/seo/keywords', authMiddleware, async (req, res) => {
  try {
    const { softwareId, seedKeyword } = req.body;

    const result = await contentGenerator.generateKeywordSuggestions(
      softwareId,
      seedKeyword
    );
    res.json({ keywords: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/seo/meta-tags', authMiddleware, async (req, res) => {
  try {
    const { content, keyword } = req.body;

    const result = await contentGenerator.generateMetaTags(content, keyword);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/seo/schema', authMiddleware, async (req, res) => {
  try {
    const { content, type } = req.body;

    const result = await contentGenerator.generateSchemaMarkup(
      content,
      type
    );
    res.json({ schema: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Blog público (lectura sin auth) ---

router.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const content = await prisma.contentPiece.findFirst({
      where: {
        status: 'PUBLISHED',
        type: { in: ['ARTICLE', 'FAQ', 'CASE_STUDY', 'COMPARISON', 'LANDING_PAGE'] },
      },
    });

    if (!content) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/blog', async (req, res) => {
  try {
    const { softwareId, type, limit = '20', offset = '0' } = req.query;

    const where: any = {
      status: 'PUBLISHED',
      type: { in: ['ARTICLE', 'FAQ', 'CASE_STUDY', 'COMPARISON', 'LANDING_PAGE'] },
    };

    if (softwareId) where.softwareId = softwareId as string;
    if (type) where.type = type as string;

    const [content, total] = await Promise.all([
      prisma.contentPiece.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        select: {
          id: true,
          title: true,
          excerpt: true,
          keywords: true,
          type: true,
          publishedAt: true,
          softwareId: true,
        },
      }),
      prisma.contentPiece.count({ where }),
    ]);

    res.json({ content, total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Video Engine ---

router.get('/video/templates', authMiddleware, async (req, res) => {
  try {
    const templates = videoGenerator.getVideoTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/video/generate', authMiddleware, async (req, res) => {
  try {
    const { softwareId, topic, template, tone, voiceId, generateAudio } = req.body;

    const result = await videoGenerator.generateVideoKit(
      softwareId,
      topic,
      template || 'hook_fact_cta',
      tone || 'profesional',
      { voiceId, generateAudio }
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/video/:id/voice', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { voiceId } = req.body;

    const content = await prisma.contentPiece.findUnique({
      where: { id },
      include: { software: { include: { growthConfig: true } } },
    });

    if (!content) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    const apiKey = content.software.growthConfig?.elevenLabsKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'ElevenLabs no configurado' });
    }

    // Extraer script
    let scriptText = content.body;
    try {
      const parsed = JSON.parse(content.body);
      if (parsed.script?.scenes) {
        scriptText = parsed.script.scenes.map((s: any) => s.voiceover).join(' ');
      }
    } catch {
      // usar body como está
    }

    const audio = await videoGenerator.generateVoiceover(scriptText, apiKey, voiceId);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Referrals ---

router.get('/referrals/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.query;
    const leaderboard = await referralService.getReferralLeaderboard(
      softwareId as string | undefined
    );
    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/referrals/:id/process-reward', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await referralService.processReferralReward(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/referrals/widget/:code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const data = await referralService.getReferralWidgetData(code, userId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Página pública de referido (no requiere auth) ---

router.get('/referral/:code/public', async (req, res) => {
  try {
    const { code } = req.params;

    const referral = await prisma.referralProgram.findUnique({
      where: { code },
      include: {
        software: true,
        referrer: { select: { nombre: true } },
      },
    });

    if (!referral) {
      return res.status(404).json({ error: 'Código no encontrado' });
    }

    const config = await prisma.growthConfig.findUnique({
      where: { softwareId: referral.softwareId },
    });

    res.json({
      code: referral.code,
      software: {
        nombre: referral.software.nombre,
        tagline: referral.software.tagline,
        descripcion: referral.software.descripcion,
        colorPrimario: referral.software.colorPrimario,
        logoUrl: referral.software.logoUrl,
        urlWebsite: referral.software.urlWebsite,
      },
      referrerName: referral.referrer.nombre,
      rewardType: config?.referralRewardType || 'months_free',
      rewardValue: config?.referralRewardValue || 1,
      doubleReward: config?.referralDoubleReward || false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === SOCIAL ACCOUNTS — Gestión multi-cuenta social ===
// ============================================================

// Listar cuentas
router.get('/social-accounts', authMiddleware, async (req, res) => {
  try {
    const { softwareId, brandId, platform, isActive } = req.query;

    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;
    if (brandId) where.brandId = brandId as string;
    if (platform) where.platform = platform as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const accounts = await prisma.socialAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        software: { select: { nombre: true, slug: true } },
        brand: { select: { nombre: true, colorPrimario: true } },
        _count: { select: { posts: true } },
      },
    });

    res.json({ accounts, total: accounts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener una cuenta con posts
router.get('/social-accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const account = await prisma.socialAccount.findUnique({
      where: { id },
      include: {
        software: { select: { nombre: true, slug: true } },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear cuenta
router.post('/social-accounts', authMiddleware, async (req, res) => {
  try {
    const data = req.body;

    const account = await prisma.socialAccount.create({
      data: {
        softwareId: data.softwareId,
        brandId: data.brandId || null,
        nombre: data.nombre,
        username: data.username,
        platform: data.platform,
        avatarUrl: data.avatarUrl,
        profileUrl: data.profileUrl,
        tematica: data.tematica,
        tono: data.tono,
        formato: data.formato,
        longitud: data.longitud,
        idioma: data.idioma,
        hashtagsDefault: data.hashtagsDefault || [],
        postingSchedule: data.postingSchedule,
        timezone: data.timezone,
        notas: data.notas,
        nicho: data.nicho,
        categorias: data.categorias || [],
        subnichos: data.subnichos || [],
        audienciaTarget: data.audienciaTarget,
        tonoExtendido: data.tonoExtendido,
        contenidoProhibido: data.contenidoProhibido,
        contenidoFavorito: data.contenidoFavorito,
      },
    });

    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar cuenta
router.put('/social-accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const account = await prisma.socialAccount.update({
      where: { id },
      data: {
        brandId: data.brandId,
        nombre: data.nombre,
        username: data.username,
        platform: data.platform,
        avatarUrl: data.avatarUrl,
        profileUrl: data.profileUrl,
        tematica: data.tematica,
        tono: data.tono,
        formato: data.formato,
        longitud: data.longitud,
        idioma: data.idioma,
        hashtagsDefault: data.hashtagsDefault,
        postingSchedule: data.postingSchedule,
        nicho: data.nicho,
        categorias: data.categorias,
        subnichos: data.subnichos,
        audienciaTarget: data.audienciaTarget,
        tonoExtendido: data.tonoExtendido,
        contenidoProhibido: data.contenidoProhibido,
        contenidoFavorito: data.contenidoFavorito,
        timezone: data.timezone,
        isActive: data.isActive,
        notas: data.notas,
      },
    });

    res.json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear múltiples cuentas a la vez (bulk)
router.post('/social-accounts/batch', authMiddleware, async (req, res) => {
  try {
    const { softwareId, platforms, nombre, username, tematica, tono, formato, longitud, idioma, hashtagsDefault, notas } = req.body;

    if (!softwareId || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'softwareId y platforms (array) son requeridos' });
    }

    const platformNames: Record<string, string> = {
      INSTAGRAM: 'Instagram', LINKEDIN: 'LinkedIn', FACEBOOK: 'Facebook',
      X: 'X / Twitter', TIKTOK: 'TikTok', REDDIT: 'Reddit',
      YOUTUBE: 'YouTube', PINTEREST: 'Pinterest', THREADS: 'Threads',
    };

    const accounts = await prisma.$transaction(
      platforms.map((platform: string) => {
        const platformName = platformNames[platform] || platform;
        // Generar nombre adaptado: "Groomly Instagram", "Groomly TikTok"...
        const nombreAdaptado = nombre.toLowerCase().includes(platformName.toLowerCase().split('/')[0].trim())
          ? nombre
          : `${nombre} ${platformName}`;

        return prisma.socialAccount.create({
          data: {
            softwareId,
            nombre: nombreAdaptado,
            groupName: nombre,
            username,
            platform: platform as SocialPlatform,
            tematica: tematica || '',
            tono: tono || 'profesional',
            formato: formato || 'feed',
            longitud: longitud || 'medio',
            idioma: idioma || 'es',
            hashtagsDefault: hashtagsDefault || [],
            notas: notas || undefined,
          },
        });
      })
    );

    res.status(201).json({ accounts, count: accounts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar cuenta
router.delete('/social-accounts/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.socialAccount.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Posts de una cuenta ---

router.get('/social-accounts/:id/posts', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = { accountId: id };
    if (status) where.status = status as string;

    const [posts, total] = await Promise.all([
      prisma.socialAccountPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.socialAccountPost.count({ where }),
    ]);

    res.json({ posts, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/social-accounts/:id/posts', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, hashtags, mediaUrls, cta, title, scheduledAt, status, formato, platformData, excerpt } = req.body;

    // Validar estado
    const validStatuses = ['IDEA', 'PLANNED', 'IN_PRODUCTION', 'IN_REVIEW', 'NEEDS_REVISION', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'];
    const finalStatus = status && validStatuses.includes(status) ? status : (scheduledAt ? 'SCHEDULED' : 'DRAFT');

    const post = await prisma.socialAccountPost.create({
      data: {
        accountId: id,
        content: content || '',
        hashtags: hashtags || [],
        mediaUrls: mediaUrls || [],
        cta,
        title,
        excerpt,
        status: finalStatus as any,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        ...(formato ? { formato } : {}),
        ...(platformData ? { platformData } : {}),
        ...(req.body.campaignId ? { campaignId: req.body.campaignId } : {}),
        ...(req.body.assignedTo ? { assignedTo: req.body.assignedTo } : {}),
      },
    });

    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/social-accounts/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const data = req.body;

    const updateData: any = {
      content: data.content,
      hashtags: data.hashtags,
      mediaUrls: data.mediaUrls,
      cta: data.cta,
      title: data.title,
      excerpt: data.excerpt,
      status: data.status,
      formato: data.formato,
      platformData: data.platformData,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      campaignId: data.campaignId,
      assignedTo: data.assignedTo,
    };

    // Si se publica, guardar fecha de publicacion
    if (data.status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    const post = await prisma.socialAccountPost.update({
      where: { id: postId },
      data: updateData,
    });

    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/social-accounts/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    await prisma.socialAccountPost.delete({ where: { id: postId } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Generación masiva de posts ---

router.post('/social-accounts/generate-batch', authMiddleware, async (req, res) => {
  try {
    const { accountIds, topic, tone, includeHashtags, includeCta } = req.body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: 'accountIds requerido (array)' });
    }

    // Obtener cuentas
    const accounts = await prisma.socialAccount.findMany({
      where: { id: { in: accountIds }, isActive: true },
    });

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No se encontraron cuentas activas' });
    }

    // Generar posts para cada cuenta
    const results = [];
    for (const account of accounts) {
      try {
        const generated = await contentGenerator.generateSocialPosts({
          softwareId: account.softwareId,
          platform: account.platform,
          count: 1,
          topic: topic || account.tematica,
          tone: tone || account.tono,
        });

        // Guardar en BD
        const gen = generated as any;
        const postContent = gen.content || gen.posts?.[0]?.content || '';
        const postHashtags = includeHashtags !== false
          ? (gen.hashtags || gen.posts?.[0]?.hashtags || [])
          : [];

        const post = await prisma.socialAccountPost.create({
          data: {
            accountId: account.id,
            content: postContent,
            hashtags: postHashtags,
            status: 'DRAFT',
            aiPrompt: `Topic: ${topic || account.tematica}, Tone: ${tone || account.tono}`,
            aiModel: 'gpt-4',
            ...(account.formato ? { formato: account.formato } : {}),
          },
        });

        results.push({ account: account.nombre, platform: account.platform, post, success: true });
      } catch (err: any) {
        results.push({ account: account.nombre, platform: account.platform, success: false, error: err.message });
      }
    }

    res.json({ results, totalGenerated: results.filter((r) => r.success).length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === BRANDS — Clientes de la agencia ===
// ============================================================

router.get('/brands', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.query;
    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;

    const brands = await prisma.brand.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { socialAccounts: true, campaigns: true } },
      },
    });
    res.json({ brands, total: brands.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/brands/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        socialAccounts: { include: { _count: { select: { posts: true } } } },
        campaigns: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!brand) return res.status(404).json({ error: 'Brand no encontrado' });
    res.json(brand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/brands', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const brand = await prisma.brand.create({
      data: {
        softwareId: data.softwareId,
        nombre: data.nombre,
        slug: data.slug || data.nombre.toLowerCase().replace(/\s+/g, '-'),
        logoUrl: data.logoUrl,
        colorPrimario: data.colorPrimario || '#6366F1',
        descripcion: data.descripcion,
        industria: data.industria,
        website: data.website,
        emailContacto: data.emailContacto,
        brandVoice: data.brandVoice,
        targetAudience: data.targetAudience,
        contentGuidelines: data.contentGuidelines,
        hashtagsOficiales: data.hashtagsOficiales || [],
        competidores: data.competidores,
        approvalWorkflow: data.approvalWorkflow,
      },
    });
    res.status(201).json(brand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/brands/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const brand = await prisma.brand.update({
      where: { id },
      data: {
        nombre: data.nombre,
        slug: data.slug,
        logoUrl: data.logoUrl,
        colorPrimario: data.colorPrimario,
        descripcion: data.descripcion,
        industria: data.industria,
        website: data.website,
        emailContacto: data.emailContacto,
        brandVoice: data.brandVoice,
        targetAudience: data.targetAudience,
        contentGuidelines: data.contentGuidelines,
        hashtagsOficiales: data.hashtagsOficiales,
        competidores: data.competidores,
        approvalWorkflow: data.approvalWorkflow,
        activo: data.activo,
      },
    });
    res.json(brand);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/brands/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.brand.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === CAMPAIGNS — Campañas de social media ===
// ============================================================

router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    const { softwareId, brandId, status } = req.query;
    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;
    if (brandId) where.brandId = brandId as string;
    if (status) where.status = status as string;

    const campaigns = await prisma.socialCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: { select: { nombre: true, colorPrimario: true } },
        _count: { select: { posts: true } },
      },
    });
    res.json({ campaigns, total: campaigns.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.socialCampaign.findUnique({
      where: { id },
      include: {
        brand: { select: { nombre: true, colorPrimario: true, logoUrl: true } },
        posts: {
          orderBy: { createdAt: 'desc' },
          include: {
            account: { select: { nombre: true, platform: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const userId = (req as any).user?.id;

    const campaign = await prisma.socialCampaign.create({
      data: {
        softwareId: data.softwareId,
        brandId: data.brandId,
        nombre: data.nombre,
        slug: data.slug || data.nombre.toLowerCase().replace(/\s+/g, '-'),
        descripcion: data.descripcion,
        objetivo: data.objetivo || 'AWARENESS',
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        presupuesto: data.presupuesto ? parseFloat(data.presupuesto) : null,
        moneda: data.moneda || 'EUR',
        status: data.status || 'PLANNING',
        briefCreativo: data.briefCreativo,
        kpisObjetivo: data.kpisObjetivo,
        colorTag: data.colorTag || '#6366F1',
        createdBy: userId,
      },
    });
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const campaign = await prisma.socialCampaign.update({
      where: { id },
      data: {
        nombre: data.nombre,
        slug: data.slug,
        descripcion: data.descripcion,
        objetivo: data.objetivo,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
        presupuesto: data.presupuesto ? parseFloat(data.presupuesto) : null,
        moneda: data.moneda,
        status: data.status,
        briefCreativo: data.briefCreativo,
        kpisObjetivo: data.kpisObjetivo,
        colorTag: data.colorTag,
      },
    });
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.socialCampaign.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === CONTENT THEMES — Temas recurrentes ===
// ============================================================

router.get('/content-themes', authMiddleware, async (req, res) => {
  try {
    const { accountId } = req.query;
    const where: any = {};
    if (accountId) where.accountId = accountId as string;

    const themes = await prisma.contentTheme.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ themes, total: themes.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/content-themes', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const theme = await prisma.contentTheme.create({
      data: {
        accountId: data.accountId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        frecuencia: data.frecuencia || 'semanal',
        diaPreferido: data.diaPreferido,
        formatoPreferido: data.formatoPreferido,
      },
    });
    res.status(201).json(theme);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/content-themes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const theme = await prisma.contentTheme.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        frecuencia: data.frecuencia,
        diaPreferido: data.diaPreferido,
        formatoPreferido: data.formatoPreferido,
        activo: data.activo,
      },
    });
    res.json(theme);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/content-themes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contentTheme.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === CONTENT HUB — Media Assets ===
// ============================================================

router.get('/media-assets', authMiddleware, async (req, res) => {
  try {
    const { softwareId, brandId, tipo, tag, search } = req.query;
    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;
    if (brandId) where.brandId = brandId as string;
    if (tipo) where.tipo = tipo as string;
    if (tag) where.tags = { has: tag as string };
    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { descripcion: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { nombre: true, colorPrimario: true } } },
    });
    res.json({ assets, total: assets.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/media-assets', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    if (!data.softwareId || !data.url || !data.nombre) {
      return res.status(400).json({ error: 'softwareId, nombre y url son requeridos' });
    }
    const asset = await prisma.mediaAsset.create({
      data: {
        softwareId: data.softwareId,
        brandId: data.brandId || null,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        tipo: data.tipo || 'IMAGE',
        url: data.url,
        thumbnailUrl: data.thumbnailUrl || null,
        dimensiones: data.dimensiones || undefined,
        duracion: data.duracion || null,
        tamanoBytes: data.tamanoBytes || null,
        tags: data.tags || [],
        plataformasRecomendadas: data.plataformasRecomendadas || [],
        formatosCompatibles: data.formatosCompatibles || [],
        metadata: data.metadata || undefined,
      },
    });
    res.status(201).json(asset);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/media-assets/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: {
        brandId: data.brandId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        tags: data.tags,
        plataformasRecomendadas: data.plataformasRecomendadas,
        formatosCompatibles: data.formatosCompatibles,
      },
    });
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Incrementar contador de uso (al insertar un asset en un post)
router.post('/media-assets/:id/use', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.mediaAsset.update({
      where: { id },
      data: { usoCount: { increment: 1 }, ultimoUsoAt: new Date() },
    });
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/media-assets/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.mediaAsset.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === CONTENT HUB — Copy Snippets ===
// ============================================================

router.get('/copy-snippets', authMiddleware, async (req, res) => {
  try {
    const { softwareId, brandId, tipo, search } = req.query;
    const where: any = {};
    if (softwareId) where.softwareId = softwareId as string;
    if (brandId) where.brandId = brandId as string;
    if (tipo) where.tipo = tipo as string;
    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { contenido: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const snippets = await prisma.copySnippet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { nombre: true, colorPrimario: true } } },
    });
    res.json({ snippets, total: snippets.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/copy-snippets', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    if (!data.softwareId || !data.nombre || !data.contenido) {
      return res.status(400).json({ error: 'softwareId, nombre y contenido son requeridos' });
    }
    const snippet = await prisma.copySnippet.create({
      data: {
        softwareId: data.softwareId,
        brandId: data.brandId || null,
        nombre: data.nombre,
        contenido: data.contenido,
        tipo: data.tipo || 'CAPTION',
        plataformas: data.plataformas || [],
        tags: data.tags || [],
      },
    });
    res.status(201).json(snippet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/copy-snippets/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const snippet = await prisma.copySnippet.update({
      where: { id },
      data: {
        brandId: data.brandId,
        nombre: data.nombre,
        contenido: data.contenido,
        tipo: data.tipo,
        plataformas: data.plataformas,
        tags: data.tags,
      },
    });
    res.json(snippet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/copy-snippets/:id/use', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const snippet = await prisma.copySnippet.update({
      where: { id },
      data: { usoCount: { increment: 1 } },
    });
    res.json(snippet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/copy-snippets/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.copySnippet.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === WORKFLOW & COLABORACIÓN — Aprobaciones, comentarios, asignación ===
// ============================================================

// Helper: mapa id->{nombre,email} para enriquecer reviewer/usuario
async function getUsuariosMap(ids: number[]): Promise<Record<number, { id: number; nombre: string; email: string }>> {
  const unique = Array.from(new Set(ids.filter((x) => typeof x === 'number')));
  if (unique.length === 0) return {};
  const usuarios = await prisma.usuarioCrm.findMany({
    where: { id: { in: unique } },
    select: { id: true, nombre: true, email: true },
  });
  return usuarios.reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {} as Record<number, { id: number; nombre: string; email: string }>);
}

// Listar usuarios del CRM (para asignar / seleccionar revisor)
router.get('/team', authMiddleware, async (_req, res) => {
  try {
    const usuarios = await prisma.usuarioCrm.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, email: true, rol: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ usuarios });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Aprobaciones ---

router.get('/posts/:postId/approvals', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const approvals = await prisma.postApproval.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });
    const usuariosMap = await getUsuariosMap(approvals.map((a) => a.reviewerId));
    res.json({ approvals: approvals.map((a) => ({ ...a, reviewer: usuariosMap[a.reviewerId] || null })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear/registrar una decisión de revisión (PENDING para solicitar, o resolución)
router.post('/posts/:postId/approvals', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { reviewerId, status, comentario, requestedChanges } = req.body;
    const currentUserId = (req as any).user?.id;
    const finalReviewerId = reviewerId || currentUserId;

    if (!finalReviewerId) {
      return res.status(400).json({ error: 'reviewerId requerido' });
    }

    const resolved = status && status !== 'PENDING';
    const approval = await prisma.postApproval.create({
      data: {
        postId,
        reviewerId: finalReviewerId,
        status: status || 'PENDING',
        comentario: comentario || null,
        requestedChanges: requestedChanges || undefined,
        resolvedAt: resolved ? new Date() : null,
      },
    });

    // Sincronizar estado del post según la decisión
    if (status === 'APPROVED') {
      await prisma.socialAccountPost.update({
        where: { id: postId },
        data: { approvedAt: new Date(), approvedBy: finalReviewerId, status: 'DRAFT' },
      });
    } else if (status === 'CHANGES_REQUESTED' || status === 'REJECTED') {
      await prisma.socialAccountPost.update({
        where: { id: postId },
        data: { status: 'NEEDS_REVISION' },
      });
    } else if (status === 'PENDING') {
      await prisma.socialAccountPost.update({
        where: { id: postId },
        data: { status: 'IN_REVIEW' },
      });
    }

    res.status(201).json(approval);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Comentarios ---

router.get('/posts/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    const usuariosMap = await getUsuariosMap(comments.map((c) => c.usuarioId));
    res.json({ comments: comments.map((c) => ({ ...c, usuario: usuariosMap[c.usuarioId] || null })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { comentario, usuarioId } = req.body;
    const finalUsuarioId = usuarioId || (req as any).user?.id;

    if (!comentario?.trim()) {
      return res.status(400).json({ error: 'comentario requerido' });
    }
    if (!finalUsuarioId) {
      return res.status(400).json({ error: 'usuarioId requerido' });
    }

    const comment = await prisma.postComment.create({
      data: { postId, usuarioId: finalUsuarioId, comentario: comentario.trim() },
    });
    const usuariosMap = await getUsuariosMap([comment.usuarioId]);
    res.status(201).json({ ...comment, usuario: usuariosMap[comment.usuarioId] || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/comments/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { resuelto } = req.body;
    const comment = await prisma.postComment.update({
      where: { id },
      data: { resuelto: resuelto !== undefined ? resuelto : true },
    });
    res.json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.postComment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Asignación ---

router.put('/posts/:postId/assign', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { assignedTo } = req.body;
    const post = await prisma.socialAccountPost.update({
      where: { id: postId },
      data: { assignedTo: assignedTo ?? null },
    });
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Cola de revisión (notificaciones básicas) ---
// Posts en IN_REVIEW de un software, opcionalmente asignados a un usuario
router.get('/review-queue', authMiddleware, async (req, res) => {
  try {
    const { softwareId, assignedTo } = req.query;
    const where: any = { status: 'IN_REVIEW' };
    if (softwareId) where.account = { softwareId: softwareId as string };
    if (assignedTo) where.assignedTo = parseInt(assignedTo as string);

    const posts = await prisma.socialAccountPost.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        account: { select: { nombre: true, platform: true, avatarUrl: true, softwareId: true } },
      },
    });

    const usuariosMap = await getUsuariosMap(
      posts.map((p) => p.assignedTo).filter((x): x is number => typeof x === 'number')
    );
    res.json({
      posts: posts.map((p) => ({
        ...p,
        assignee: p.assignedTo ? usuariosMap[p.assignedTo] || null : null,
      })),
      total: posts.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === CALENDARIO EDITORIAL UNIFICADO ===
// ============================================================

const EVENTO_COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6',
  orange: '#f59e0b', red: '#ef4444', pink: '#ec4899',
};

// Calendario unificado: posts sociales + contenido SEO + emails + eventos
router.get('/calendar/unified', authMiddleware, async (req, res) => {
  try {
    const { softwareId, startDate, endDate, types } = req.query;
    if (!softwareId) return res.status(400).json({ error: 'softwareId requerido' });

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 60 * 86400000);
    const wanted = types ? (types as string).split(',') : ['post', 'content', 'email', 'event'];

    const items: any[] = [];

    // 1. Posts sociales
    if (wanted.includes('post')) {
      const posts = await prisma.socialAccountPost.findMany({
        where: {
          account: { softwareId: softwareId as string },
          scheduledAt: { gte: start, lte: end },
        },
        include: { account: { select: { nombre: true, platform: true, brandId: true } } },
      });
      for (const p of posts) {
        items.push({
          id: p.id,
          type: 'post',
          title: p.title || p.content?.slice(0, 60) || 'Post sin título',
          date: p.scheduledAt,
          status: p.status,
          platform: p.account?.platform || null,
          accountName: p.account?.nombre || null,
          brandId: p.account?.brandId || null,
          campaignId: p.campaignId || null,
          color: '#ec4899',
        });
      }
    }

    // 2. Contenido SEO / artículos
    if (wanted.includes('content')) {
      const content = await prisma.contentPiece.findMany({
        where: {
          softwareId: softwareId as string,
          scheduledAt: { gte: start, lte: end },
        },
      });
      for (const c of content) {
        items.push({
          id: c.id,
          type: 'content',
          title: c.title,
          date: c.scheduledAt,
          status: c.status,
          platform: c.platform || null,
          contentType: c.type,
          color: '#10b981',
        });
      }
    }

    // 3. Campañas de email
    if (wanted.includes('email')) {
      const emails = await prisma.emailCampana.findMany({
        where: {
          softwareId: softwareId as string,
          programadaPara: { gte: start, lte: end },
        },
      });
      for (const e of emails) {
        items.push({
          id: e.id,
          type: 'email',
          title: e.nombre,
          date: e.programadaPara,
          status: e.estado,
          color: '#3b82f6',
        });
      }
    }

    // 4. Eventos manuales (globales del CRM)
    if (wanted.includes('event')) {
      const eventos = await prisma.calendarioEvento.findMany({
        where: { fechaInicio: { gte: start, lte: end } },
      });
      for (const ev of eventos) {
        items.push({
          id: ev.id,
          type: 'event',
          title: ev.titulo,
          date: ev.fechaInicio,
          status: ev.completado ? 'COMPLETED' : 'PENDING',
          color: EVENTO_COLOR_HEX[ev.color] || '#f59e0b',
        });
      }
    }

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    res.json({ items, total: items.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reprogramar un item arrastrándolo en el calendario
router.put('/calendar/reschedule', authMiddleware, async (req, res) => {
  try {
    const { type, id, date } = req.body;
    if (!type || !id || !date) {
      return res.status(400).json({ error: 'type, id y date son requeridos' });
    }
    const newDate = new Date(date);

    switch (type) {
      case 'post':
        await prisma.socialAccountPost.update({ where: { id }, data: { scheduledAt: newDate } });
        break;
      case 'content':
        await prisma.contentPiece.update({ where: { id }, data: { scheduledAt: newDate } });
        break;
      case 'email':
        await prisma.emailCampana.update({ where: { id }, data: { programadaPara: newDate } });
        break;
      case 'event': {
        const ev = await prisma.calendarioEvento.findUnique({ where: { id } });
        if (ev) {
          const duration = ev.fechaFin.getTime() - ev.fechaInicio.getTime();
          await prisma.calendarioEvento.update({
            where: { id },
            data: { fechaInicio: newDate, fechaFin: new Date(newDate.getTime() + Math.max(duration, 0)) },
          });
        }
        break;
      }
      default:
        return res.status(400).json({ error: 'Tipo no soportado' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Best time to post: analiza engagement histórico por día/hora
router.get('/calendar/best-times', authMiddleware, async (req, res) => {
  try {
    const { softwareId, platform } = req.query;
    if (!softwareId) return res.status(400).json({ error: 'softwareId requerido' });

    const where: any = {
      account: { softwareId: softwareId as string },
      status: 'PUBLISHED',
      publishedAt: { not: null },
    };
    if (platform) where.account = { ...where.account, platform: platform as string };

    const posts = await prisma.socialAccountPost.findMany({
      where,
      select: { publishedAt: true, engagement: true, likes: true, comments: true, shares: true },
    });

    // Agregar engagement por (díaSemana, hora)
    const buckets: Record<string, { total: number; count: number }> = {};
    for (const p of posts) {
      if (!p.publishedAt) continue;
      const d = new Date(p.publishedAt);
      const key = `${d.getDay()}-${d.getHours()}`;
      const eng = p.engagement || p.likes + p.comments + p.shares;
      if (!buckets[key]) buckets[key] = { total: 0, count: 0 };
      buckets[key].total += eng;
      buckets[key].count += 1;
    }

    const ranked = Object.entries(buckets)
      .map(([key, v]) => {
        const [dia, hora] = key.split('-').map(Number);
        return { dia, hora, avgEngagement: v.total / v.count, samples: v.count };
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Si no hay datos suficientes, usar best-practices por plataforma
    const DEFAULTS: Record<string, Array<{ dia: number; hora: number }>> = {
      INSTAGRAM: [{ dia: 3, hora: 11 }, { dia: 5, hora: 13 }, { dia: 1, hora: 19 }],
      LINKEDIN: [{ dia: 2, hora: 9 }, { dia: 3, hora: 12 }, { dia: 4, hora: 8 }],
      X: [{ dia: 3, hora: 9 }, { dia: 5, hora: 12 }, { dia: 1, hora: 17 }],
      TIKTOK: [{ dia: 2, hora: 19 }, { dia: 4, hora: 21 }, { dia: 6, hora: 11 }],
      FACEBOOK: [{ dia: 3, hora: 13 }, { dia: 4, hora: 15 }, { dia: 0, hora: 12 }],
    };

    res.json({
      hasData: ranked.length >= 3,
      best: ranked.slice(0, 5),
      defaults: platform ? DEFAULTS[platform as string] || [] : [],
      totalAnalyzed: posts.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// === ANALYTICS SOCIAL & REPORTING ===
// ============================================================

function parseAnalyticsFilters(q: any) {
  return {
    startDate: q.startDate ? new Date(q.startDate as string) : undefined,
    endDate: q.endDate ? new Date(q.endDate as string) : undefined,
    brandId: (q.brandId as string) || undefined,
    platform: (q.platform as string) || undefined,
  };
}

router.get('/analytics/social', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.query;
    if (!softwareId) return res.status(400).json({ error: 'softwareId requerido' });
    const data = await socialAnalyticsService.getSocialAnalytics(softwareId as string, parseAnalyticsFilters(req.query));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Captura snapshot diario de métricas a SocialPostMetric
router.post('/analytics/social/snapshot', authMiddleware, async (req, res) => {
  try {
    const { softwareId } = req.body;
    if (!softwareId) return res.status(400).json({ error: 'softwareId requerido' });
    const result = await socialAnalyticsService.snapshotMetrics(softwareId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Genera reporte con resumen ejecutivo IA
router.post('/analytics/social/report', authMiddleware, async (req, res) => {
  try {
    const { softwareId, startDate, endDate, brandId, platform } = req.body;
    if (!softwareId) return res.status(400).json({ error: 'softwareId requerido' });
    const data = await socialAnalyticsService.generateReport(softwareId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      brandId: brandId || undefined,
      platform: platform || undefined,
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
