import { prisma } from '../config/database';
import { sendEnvioById } from '../services/emailService';
import { logger } from '../utils/logger';

const EMAILS_PER_SECOND = 6;
const DELAY_MS = Math.ceil(1000 / EMAILS_PER_SECOND);
const BATCH_SIZE = 25;

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/**
 * Procesa todos los envíos pendientes de una campaña con throttling.
 * Diseñado para ejecutarse fire-and-forget desde lanzarCampana().
 *
 * Reentrant-safe: si el proceso se cae a mitad, al reiniciar el server puede
 * relanzarse manualmente y continuará con los que sigan pendientes.
 */
export async function processCampanaWorker(campanaId: string): Promise<void> {
  logger.info(`[emailWorker] Iniciando campaña ${campanaId}`);

  const campana = await prisma.emailCampana.findUnique({ where: { id: campanaId } });
  if (!campana) {
    logger.error(`[emailWorker] Campaña ${campanaId} no encontrada`);
    return;
  }

  let processed = 0;
  let sentCount = 0;
  let failedCount = 0;

  while (true) {
    // Comprobar si la campaña fue cancelada externamente
    const fresh = await prisma.emailCampana.findUnique({
      where: { id: campanaId },
      select: { estado: true },
    });
    if (!fresh || fresh.estado === 'cancelada' || fresh.estado === 'error') {
      logger.info(`[emailWorker] Campaña ${campanaId} cancelada/error — abortando`);
      return;
    }

    // Sacar siguiente lote de pendientes
    const batch = await prisma.emailEnvio.findMany({
      where: { campanaId, estado: 'pendiente' },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    if (batch.length === 0) break;

    for (const envio of batch) {
      const { ok } = await sendEnvioById(envio.id, campana.softwareId);
      processed++;
      if (ok) sentCount++;
      else failedCount++;

      // Actualizar contadores cada 10 envíos para reducir writes
      if (processed % 10 === 0) {
        await prisma.emailCampana.update({
          where: { id: campanaId },
          data: { enviados: { increment: 10 }, rebotes: failedCount > 10 ? { increment: 0 } : undefined },
        });
      }

      await sleep(DELAY_MS);
    }
  }

  // Contar finales reales (más fiable que el running tally)
  const [enviadosReales, fallidosReales, reservadosPendientes] = await Promise.all([
    prisma.emailEnvio.count({ where: { campanaId, estado: 'enviado' } }),
    prisma.emailEnvio.count({ where: { campanaId, estado: 'fallido' } }),
    prisma.emailEnvio.count({ where: { campanaId, estado: 'reservado' } }),
  ]);

  // Si hay reservados (A/B esperando ganadora) NO marcamos como 'enviada' aún;
  // queda en estado "ab_waiting" hasta que se promueva.
  const fresh = await prisma.emailCampana.findUnique({ where: { id: campanaId } });
  const nextEstado = reservadosPendientes > 0 && fresh?.esAbTest
    ? 'ab_waiting'
    : fallidosReales === campana.totalLeads ? 'error' : 'enviada';

  await prisma.emailCampana.update({
    where: { id: campanaId },
    data: {
      estado: nextEstado,
      enviados: enviadosReales,
      rebotes: fallidosReales,
      completadaEn: nextEstado === 'ab_waiting' ? null : new Date(),
    },
  });

  logger.info(
    `[emailWorker] Campaña ${campanaId} completa: ${enviadosReales} enviados, ${fallidosReales} fallidos`,
  );
}
