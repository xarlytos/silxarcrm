import cron from 'node-cron';
import { prisma } from '../config/database';

// Job: Procesar productos en estado GENERATING
export async function processGeneratingProducts() {
  console.log('[Asset Jobs] Revisando productos en GENERATING...');
  try {
    const products = await prisma.assetProduct.findMany({
      where: { status: 'GENERATING' },
      take: 10,
      orderBy: { createdAt: 'asc' },
    });

    if (products.length === 0) {
      console.log('[Asset Jobs] No hay productos pendientes');
      return;
    }

    console.log(`[Asset Jobs] Procesando ${products.length} productos...`);

    for (const product of products) {
      try {
        // Stub: en fase 3 se reemplaza con llamada real al generator service
        // Por ahora simulamos un delay y marcamos como READY
        await prisma.assetProduct.update({
          where: { id: product.id },
          data: { status: 'READY' },
        });
        console.log(`[Asset Jobs] Producto ${product.id} marcado como READY`);
      } catch (err: any) {
        console.error(`[Asset Jobs] Error procesando ${product.id}:`, err.message);
        await prisma.assetProduct.update({
          where: { id: product.id },
          data: { status: 'ERROR' },
        });
      }
    }
  } catch (error: any) {
    console.error('[Asset Jobs] Error general:', error.message);
  }
}

// Cada 5 minutos revisar productos en GENERATING
export const assetGenerateJob = cron.schedule('*/5 * * * *', processGeneratingProducts, {
  scheduled: false,
  timezone: 'Europe/Madrid',
});

export function startAssetJobs() {
  assetGenerateJob.start();
  console.log('[Asset Jobs] Cron jobs iniciados');
}

export function stopAssetJobs() {
  assetGenerateJob.stop();
}
