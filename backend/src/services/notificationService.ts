import { getFirebaseMessaging } from '../config/firebase';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { WebhookEventType, NOTIFIABLE_EVENTS } from '../types/webhook';

interface NotificationPayload {
  type: WebhookEventType;
  clienteId?: number;
  saas: string;
  eventoId: number;
  title: string;
  body: string;
  accionRapida?: string;
}

const NOTIFICATION_CONFIG: Record<string, { sound: boolean; vibration: string; lockScreen: boolean }> = {
  nuevo_registro: { sound: true, vibration: 'short', lockScreen: true },
  pago_exitoso: { sound: true, vibration: 'short', lockScreen: false },
  pago_fallido: { sound: true, vibration: 'long', lockScreen: true },
  trial_expirado: { sound: true, vibration: 'medium', lockScreen: true },
  cancelacion: { sound: true, vibration: 'long', lockScreen: true },
  upgrade_plan: { sound: true, vibration: 'short', lockScreen: false },
  downgrade_plan: { sound: true, vibration: 'short', lockScreen: true },
  reactivacion: { sound: true, vibration: 'short', lockScreen: true },
};

export async function sendPushNotification(payload: NotificationPayload): Promise<void> {
  if (!env.FCM_ENABLED) return;

  const eventConfig = NOTIFIABLE_EVENTS[payload.type];
  if (!eventConfig?.notify) return;

  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  try {
    const users = await prisma.usuarioCrm.findMany({
      where: { notificacionesActivas: true, activo: true, fcmToken: { not: null } },
      select: { fcmToken: true },
    });

    const tokens = users.map((u) => u.fcmToken).filter(Boolean) as string[];
    if (tokens.length === 0) return;

    const config = NOTIFICATION_CONFIG[payload.type] || { sound: true, vibration: 'short', lockScreen: false };

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type,
        clienteId: String(payload.clienteId || ''),
        saas: payload.saas,
        eventoId: String(payload.eventoId),
        accionRapida: payload.accionRapida || '',
        critical: String(eventConfig.critical),
      },
      android: {
        priority: eventConfig.critical ? 'high' as const : 'normal' as const,
        notification: {
          sound: config.sound ? 'default' : undefined,
          channelId: eventConfig.critical ? 'critical' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: config.sound ? 'default' : undefined,
            badge: 1,
          },
        },
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    logger.info(`Push sent: ${response.successCount}/${tokens.length} successful`);
  } catch (error) {
    logger.error('Push notification error:', error);
  }
}

export function buildNotificationTitle(event: WebhookEventType, saas: string): string {
  const titles: Record<string, string> = {
    nuevo_registro: `Nuevo registro en ${saas}`,
    pago_exitoso: `Pago recibido en ${saas}`,
    pago_fallido: `Pago fallido en ${saas}`,
    upgrade_plan: `Upgrade en ${saas}`,
    downgrade_plan: `Downgrade en ${saas}`,
    cancelacion: `Cancelación en ${saas}`,
    reactivacion: `Reactivación en ${saas}`,
    trial_expirado: `Trial expirado en ${saas}`,
  };
  return titles[event] || `Evento en ${saas}`;
}

export function buildNotificationBody(event: WebhookEventType, clienteName: string, monto?: number): string {
  const bodies: Record<string, string> = {
    nuevo_registro: `${clienteName} se ha registrado`,
    pago_exitoso: `${clienteName} ha pagado ${monto ? `€${monto}` : ''}`,
    pago_fallido: `Fallo en pago de ${clienteName}`,
    upgrade_plan: `${clienteName} ha mejorado su plan`,
    downgrade_plan: `${clienteName} ha bajado de plan`,
    cancelacion: `${clienteName} ha cancelado su suscripción`,
    reactivacion: `${clienteName} ha vuelto`,
    trial_expirado: `Trial de ${clienteName} ha expirado`,
  };
  return bodies[event] || `Evento de ${clienteName}`;
}
