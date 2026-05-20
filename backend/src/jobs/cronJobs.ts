import cron from 'node-cron';
import { calculateDailyMetrics } from '../services/metricsService';
import { procesarEnviosProgramados } from '../services/whatsappWebJsService';
import { prisma } from '../config/database';
import { sendPushNotification } from '../services/notificationService';
import { logger } from '../utils/logger';

export function initCronJobs(): void {
  // Calculate daily metrics at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily metrics calculation...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await calculateDailyMetrics(yesterday);
    logger.info('Daily metrics calculated');
  });

  // Check expiring trials at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('Checking expiring trials...');
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringTrials = await prisma.suscripcion.findMany({
      where: {
        estado: 'trial',
        fechaInicio: {
          lte: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11+ days ago (assuming 14-day trial)
        },
      },
      include: { cliente: true },
    });

    for (const trial of expiringTrials) {
      const evento = await prisma.evento.create({
        data: {
          tipo: 'trial_expirado',
          severidad: 'info',
          clienteId: trial.clienteId,
          suscripcionId: trial.id,
          saas: trial.saas,
          datos: { diasRestantes: trial.diasTrialRestantes },
        },
      });

      await sendPushNotification({
        type: 'trial_expirado',
        clienteId: trial.clienteId,
        saas: trial.saas,
        eventoId: evento.id,
        title: `Trial expirando en ${trial.saas}`,
        body: `${trial.cliente.nombre} - ${trial.diasTrialRestantes || 0} días restantes`,
        accionRapida: 'contactar',
      });
    }

    logger.info(`Found ${expiringTrials.length} expiring trials`);
  });

  // Check persistent failed payments at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    logger.info('Checking persistent failed payments...');
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const failedPayments = await prisma.pago.findMany({
      where: {
        estado: 'fallido',
        fechaPago: { gte: threeDaysAgo },
      },
      include: { cliente: true, suscripcion: true },
    });

    // Group by client to avoid duplicate alerts
    const byClient = new Map<number, typeof failedPayments>();
    for (const payment of failedPayments) {
      const existing = byClient.get(payment.clienteId) || [];
      existing.push(payment);
      byClient.set(payment.clienteId, existing);
    }

    for (const [clienteId, payments] of byClient) {
      if (payments.length >= 2) {
        const cliente = payments[0].cliente;
        const saas = payments[0].suscripcion.saas;

        const evento = await prisma.evento.create({
          data: {
            tipo: 'pago_fallido',
            severidad: 'critico',
            clienteId,
            saas,
            datos: { pagos_fallidos: payments.length, mensaje: 'Múltiples pagos fallidos' },
          },
        });

        await sendPushNotification({
          type: 'pago_fallido',
          clienteId,
          saas,
          eventoId: evento.id,
          title: `⚠️ Pagos fallidos persistentes`,
          body: `${cliente.nombre} tiene ${payments.length} pagos fallidos en ${saas}`,
          accionRapida: 'reintentar',
        });
      }
    }

    logger.info(`Checked ${byClient.size} clients with failed payments`);
  });

  // Procesar envíos de WhatsApp programados cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      await procesarEnviosProgramados();
    } catch (error) {
      logger.error('Error procesando envíos programados:', error);
    }
  });

  logger.info('Cron jobs initialized');
}
