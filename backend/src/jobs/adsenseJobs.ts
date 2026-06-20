import cron from 'node-cron';
import { prisma } from '../config/database';
import adContentService from '../services/adsense/adContentService';
import adPublisherService from '../services/adsense/adPublisherService';

/**
 * Genera y publica artículos para TODOS los sitios activos de la red,
 * y notifica a Google el sitemap de cada dominio.
 * Corre todos los días a las 3:30 AM.
 */
export async function generateDailyArticles() {
  console.log('[Adsense Jobs] Generando artículos diarios (red multi-sitio)...');
  try {
    const sites = await prisma.adSite.findMany({ where: { activo: true } });
    let total = 0;
    for (const site of sites) {
      const articles = await adContentService.generateBatch(site.id, 2);
      for (const a of articles) await adPublisherService.publish(a.id);
      if (articles.length) await adPublisherService.pingGoogle(site.domain);
      total += articles.length;
    }
    console.log(`[Adsense Jobs] ${total} artículos publicados en ${sites.length} sitios`);
  } catch (error: any) {
    console.error('[Adsense Jobs] Error generando artículos:', error.message);
  }
}

export const generateArticlesJob = cron.schedule('30 3 * * *', generateDailyArticles, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

export function startAdsenseJobs() {
  generateArticlesJob.start();
  console.log('[Adsense Jobs] Cron jobs de la red AdSense iniciados');
}

export function stopAdsenseJobs() {
  generateArticlesJob.stop();
  console.log('[Adsense Jobs] Cron jobs de la red AdSense detenidos');
}
