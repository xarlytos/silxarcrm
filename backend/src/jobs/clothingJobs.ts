import cron from 'node-cron';
import brandGeneratorService from '../services/clothing/brandGeneratorService';
import designGeneratorService from '../services/clothing/designGeneratorService';

/**
 * Genera automáticamente una marca nueva con sus diseños cada semana.
 * Los productos NO se publican automáticamente: quedan en DRAFT para
 * revisión humana antes de salir a la tienda.
 * Corre los lunes a las 6:00 AM.
 */
export async function generateWeeklyBrand() {
  console.log('[Clothing Jobs] Generando marca semanal...');
  try {
    const brand = await brandGeneratorService.generateBrand();
    const designs = await designGeneratorService.generateDesigns(brand.id, 3);
    console.log(`[Clothing Jobs] Marca "${brand.nombre}" creada con ${designs.length} diseños (DRAFT)`);
  } catch (error: any) {
    console.error('[Clothing Jobs] Error generando marca:', error.message);
  }
}

// Lunes a las 6:00 AM
export const generateBrandJob = cron.schedule('0 6 * * 1', generateWeeklyBrand, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

export function startClothingJobs() {
  generateBrandJob.start();
  console.log('[Clothing Jobs] Cron jobs de marcas de ropa iniciados');
}

export function stopClothingJobs() {
  generateBrandJob.stop();
  console.log('[Clothing Jobs] Cron jobs de marcas de ropa detenidos');
}
