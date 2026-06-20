import cron from 'node-cron';
import socialPublisher from '../services/growth/socialPublisher';
import growthMetricsService from '../services/growth/growthMetricsService';
import marketplaceMonitorService from '../services/growth/marketplaceMonitorService';
import contentGenerator from '../services/growth/contentGenerator';
import activationService from '../services/growth/activationService';
import radarService from '../services/growth/radarService';
import caseStudyService from '../services/growth/caseStudyService';
import { PrismaClient, SocialPlatform } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Publica todo el contenido programado que ya llegó a su hora
 * Corre cada hora
 */
export async function publishScheduledContent() {
  console.log('[Growth Jobs] Publicando contenido programado...');

  try {
    const result = await socialPublisher.publishScheduled();
    console.log(`[Growth Jobs] Publicado: ${result.published}, Fallido: ${result.failed}`);
  } catch (error: any) {
    console.error('[Growth Jobs] Error publicando contenido:', error.message);
  }
}

/**
 * Sincroniza métricas de posts publicados desde APIs de redes sociales
 * Corre cada 6 horas
 */
export async function syncSocialMetrics() {
  console.log('[Growth Jobs] Sincronizando métricas sociales...');

  try {
    await socialPublisher.syncMetrics();
    console.log('[Growth Jobs] Métricas sincronizadas');
  } catch (error: any) {
    console.error('[Growth Jobs] Error sincronizando métricas:', error.message);
  }
}

/**
 * Genera contenido SEO programado
 * Corre todos los días a las 3:00 AM
 */
export async function generateSeoContent() {
  console.log('[Growth Jobs] Generando contenido SEO...');

  try {
    const softwares = await prisma.software.findMany({
      where: { activo: true },
      include: { growthConfig: true },
    });

    for (const software of softwares) {
      if (!software.growthConfig?.seoEnabled) continue;

      const keywords = software.growthConfig.targetKeywords || [];
      if (keywords.length === 0) continue;

      // Generar 1 artículo por día con la siguiente keyword rotativa
      const today = new Date().getDate();
      const keyword = keywords[today % keywords.length];

      try {
        await contentGenerator.generateSeoContent({
          softwareId: software.id,
          keyword,
          type: 'ARTICLE',
        });
        console.log(`[Growth Jobs] Artículo SEO generado para ${software.nombre}: ${keyword}`);
      } catch (err: any) {
        console.error(`[Growth Jobs] Error generando SEO para ${software.nombre}:`, err.message);
      }
    }
  } catch (error: any) {
    console.error('[Growth Jobs] Error en generación SEO:', error.message);
  }
}

/**
 * Monitoriza marketplaces en busca de oportunidades
 * Corre todos los días a las 4:00 AM
 */
export async function monitorMarketplaces() {
  console.log('[Growth Jobs] Monitorizando marketplaces...');

  try {
    const count = await marketplaceMonitorService.monitorAll();
    console.log(`[Growth Jobs] ${count} oportunidades detectadas`);
  } catch (error: any) {
    console.error('[Growth Jobs] Error monitorizando marketplaces:', error.message);
  }
}

/**
 * Genera contenido social semanal
 * Corre todos los lunes a las 5:00 AM
 */
export async function generateWeeklySocialContent() {
  console.log('[Growth Jobs] Generando contenido social semanal...');

  try {
    const softwares = await prisma.software.findMany({
      where: { activo: true },
      include: { growthConfig: true },
    });

    const platforms: SocialPlatform[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X'];

    for (const software of softwares) {
      if (!software.growthConfig?.socialEnabled) continue;

      const tokenMap: Record<string, string | null | undefined> = {
        LINKEDIN: software.growthConfig.linkedInToken,
        FACEBOOK: software.growthConfig.facebookToken,
        INSTAGRAM: software.growthConfig.instagramToken,
        X: software.growthConfig.xToken,
      };

      for (const platform of platforms) {
        if (!tokenMap[platform]) continue;

        try {
          await contentGenerator.generateSocialPosts({
            softwareId: software.id,
            platform,
            count: 7, // 1 post por día
          });
          console.log(`[Growth Jobs] Posts ${platform} generados para ${software.nombre}`);
        } catch (err: any) {
          console.error(`[Growth Jobs] Error generando ${platform} para ${software.nombre}:`, err.message);
        }
      }
    }
  } catch (error: any) {
    console.error('[Growth Jobs] Error en generación social:', error.message);
  }
}

/**
 * Calcula métricas diarias del embudo de Growth
 * Corre todos los días a las 2:00 AM
 */
export async function calculateGrowthMetrics() {
  console.log('[Growth Jobs] Calculando métricas de Growth...');

  try {
    const result = await growthMetricsService.calculateAllMetrics();
    console.log(`[Growth Jobs] Métricas calculadas: ${result.succeeded} exitosos, ${result.failed} fallidos`);
  } catch (error: any) {
    console.error('[Growth Jobs] Error calculando métricas:', error.message);
  }
}

/**
 * Procesa activaciones programadas pendientes
 * Corre cada 10 minutos para ejecutar emails, WhatsApp y llamadas programadas
 */
export async function processScheduledActivations() {
  console.log('[Growth Jobs] Procesando activaciones programadas...');

  try {
    const result = await activationService.processPendingActivations();
    console.log(`[Growth Jobs] Activaciones: ${result.processed} ejecutadas, ${result.failed} fallidas`);
  } catch (error: any) {
    console.error('[Growth Jobs] Error procesando activaciones:', error.message);
  }
}

/**
 * Radar: rastrea negocios que encajan con el ICP de cada software con el Radar activado.
 * Corre todos los días a las 3:30 AM
 */
export async function runRadarScan() {
  console.log('[Growth Jobs] Ejecutando Radar de leads...');

  try {
    const configs = await prisma.radarConfig.findMany({
      where: { enabled: true, sector: { not: null } },
    });

    for (const config of configs) {
      try {
        const result = await radarService.runRadar(config.softwareId, { trigger: 'cron' });
        console.log(`[Growth Jobs] Radar ${config.softwareId}: ${result.created} leads nuevos (${result.matched} ICP / ${result.scanned} escaneados)`);
      } catch (err: any) {
        console.error(`[Growth Jobs] Error en Radar para ${config.softwareId}:`, err.message);
      }
    }
  } catch (error: any) {
    console.error('[Growth Jobs] Error en Radar:', error.message);
  }
}

/**
 * Casos de éxito automáticos: detecta hitos (leads convertidos, umbrales de
 * conversión) y genera borradores de case study con datos reales.
 * Corre todos los días a las 6:00 AM
 */
export async function generateCaseStudies() {
  console.log('[Growth Jobs] Generando casos de éxito automáticos...');

  try {
    const result = await caseStudyService.autoGenerateCaseStudies(3);
    console.log(`[Growth Jobs] Casos de éxito: ${result.generated} generados, ${result.errors} errores`);
  } catch (error: any) {
    console.error('[Growth Jobs] Error generando casos de éxito:', error.message);
  }
}

// --- Schedules ---

// Cada hora: publicar contenido programado
export const publishScheduledJob = cron.schedule('0 * * * *', publishScheduledContent, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Cada 6 horas: sincronizar métricas
export const syncMetricsJob = cron.schedule('0 */6 * * *', syncSocialMetrics, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Todos los días a las 3:00 AM: generar SEO
export const generateSeoJob = cron.schedule('0 3 * * *', generateSeoContent, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Todos los días a las 4:00 AM: monitorizar marketplaces
export const monitorMarketplacesJob = cron.schedule('0 4 * * *', monitorMarketplaces, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Todos los lunes a las 5:00 AM: generar contenido social semanal
export const generateSocialJob = cron.schedule('0 5 * * 1', generateWeeklySocialContent, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Todos los días a las 2:00 AM: calcular métricas
export const calculateMetricsJob = cron.schedule('0 2 * * *', calculateGrowthMetrics, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Cada 10 minutos: procesar activaciones programadas
export const activationJob = cron.schedule('*/10 * * * *', processScheduledActivations, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Todos los días a las 3:30 AM: Radar de leads
export const radarJob = cron.schedule('30 3 * * *', runRadarScan, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

// Todos los días a las 6:00 AM: casos de éxito automáticos
export const caseStudyJob = cron.schedule('0 6 * * *', generateCaseStudies, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

/**
 * Inicia todos los jobs del Growth Engine
 */
export function startGrowthJobs() {
  publishScheduledJob.start();
  syncMetricsJob.start();
  generateSeoJob.start();
  monitorMarketplacesJob.start();
  generateSocialJob.start();
  calculateMetricsJob.start();
  activationJob.start();
  radarJob.start();
  caseStudyJob.start();

  console.log('[Growth Jobs] Todos los cron jobs del Growth Engine iniciados (incluyendo activación automática y Radar)');
}

/**
 * Detiene todos los jobs del Growth Engine
 */
export function stopGrowthJobs() {
  publishScheduledJob.stop();
  syncMetricsJob.stop();
  generateSeoJob.stop();
  monitorMarketplacesJob.stop();
  generateSocialJob.stop();
  calculateMetricsJob.stop();
  activationJob.stop();
  radarJob.stop();
  caseStudyJob.stop();

  console.log('[Growth Jobs] Todos los cron jobs del Growth Engine detenidos');
}
