import { prisma } from '../config/database';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface TrackingEvent {
  event: string;
  crm_id: string;
  timestamp?: string;
  event_id?: string; // Para deduplicación
  user_id?: string;
  email?: string;
  session_id?: string;
  data: Record<string, any>;
}

export interface TrackingResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// Generar una nueva API key
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = 'sk_' + crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = key.substring(0, 12);
  return { key, hash, prefix };
}

// Validar una API key
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  crmId?: string;
  error?: string;
}> {
  try {
    if (!key.startsWith('sk_')) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyPrefix: prefix,
        keyHash: hash,
        activo: true,
      },
      include: { crmClient: true },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    if (!apiKey.crmClient.activo) {
      return { valid: false, error: 'CRM client inactive' };
    }

    // Actualizar último uso
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { ultimoUso: new Date() },
    });

    return { valid: true, crmId: apiKey.crmId };
  } catch (error) {
    logger.error('Error validating API key:', error);
    return { valid: false, error: 'Internal error' };
  }
}

// Trackear un evento
export async function trackEvent(
  event: TrackingEvent,
  crmId: string,
  metadata: { ip?: string; userAgent?: string }
): Promise<TrackingResult> {
  try {
    // Validar evento requerido
    if (!event.event || typeof event.event !== 'string') {
      return { success: false, error: 'Event name is required' };
    }

    // Validar timestamp
    let timestamp: Date;
    if (event.timestamp) {
      timestamp = new Date(event.timestamp);
      if (isNaN(timestamp.getTime())) {
        return { success: false, error: 'Invalid timestamp' };
      }
    } else {
      timestamp = new Date();
    }

    // Generar event_id si no viene (para deduplicación)
    const eventId = event.event_id || `${crmId}:${event.event}:${event.user_id || 'anon'}:${timestamp.getTime()}`;

    // Verificar duplicado
    const existing = await prisma.trackedEvent.findFirst({
      where: { eventId, crmId },
    });

    if (existing) {
      logger.info(`Duplicate event ignored: ${eventId}`);
      return { success: true, eventId: existing.id };
    }

    // Crear evento
    const trackedEvent = await prisma.trackedEvent.create({
      data: {
        crmId,
        eventName: event.event,
        eventId,
        userId: event.user_id,
        email: event.email,
        sessionId: event.session_id,
        datos: event.data,
        timestamp,
        ipOrigen: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });

    logger.info(`Event tracked: ${event.event} for CRM ${crmId}`);

    // Procesar evento asíncronamente (analytics, alertas, etc.)
    processEventAsync(trackedEvent).catch(err => {
      logger.error('Error processing event async:', err);
    });

    return { success: true, eventId: trackedEvent.id };
  } catch (error) {
    logger.error('Error tracking event:', error);
    return { success: false, error: 'Internal error' };
  }
}

// Procesamiento asíncrono de eventos
async function processEventAsync(event: any): Promise<void> {
  // Aquí puedes añadir:
  // - Enviar a cola de mensajes (RabbitMQ, SQS, etc.)
  // - Actualizar métricas en tiempo real
  // - Disparar webhooks
  // - Notificaciones push
  // - etc.

  // Por ahora, solo marcamos como procesado
  await prisma.trackedEvent.update({
    where: { id: event.id },
    data: { procesado: true },
  });
}

// Crear un nuevo CRM Client con API Key
export async function createCrmClient(
  name: string,
  saas: string,
  descripcion?: string
): Promise<{ crm: any; apiKey: string }> {
  const { key, hash, prefix } = generateApiKey();

  const crm = await prisma.crmClient.create({
    data: {
      name,
      saas,
      descripcion,
      apiKeys: {
        create: {
          keyHash: hash,
          keyPrefix: prefix,
          nombre: 'Default',
        },
      },
    },
  });

  return { crm, apiKey: key };
}

// Obtener métricas de tracking para un CRM
export async function getTrackingMetrics(
  crmId: string,
  days: number = 30
): Promise<any> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    totalEvents,
    uniqueUsers,
    eventsByType,
    recentEvents,
  ] = await Promise.all([
    prisma.trackedEvent.count({
      where: { crmId, timestamp: { gte: startDate } },
    }),
    prisma.trackedEvent.groupBy({
      by: ['userId'],
      where: { crmId, timestamp: { gte: startDate }, userId: { not: null } },
      _count: true,
    }).then(r => r.length),
    prisma.trackedEvent.groupBy({
      by: ['eventName'],
      where: { crmId, timestamp: { gte: startDate } },
      _count: true,
    }),
    prisma.trackedEvent.findMany({
      where: { crmId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        eventName: true,
        userId: true,
        email: true,
        timestamp: true,
        datos: true,
      },
    }),
  ]);

  return {
    totalEvents,
    uniqueUsers,
    eventsByType: eventsByType.map(e => ({
      name: e.eventName,
      count: e._count,
    })),
    recentEvents,
  };
}
