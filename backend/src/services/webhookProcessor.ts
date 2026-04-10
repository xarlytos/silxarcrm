import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { WebhookPayload } from '../types/webhook';
import { sendPushNotification, buildNotificationTitle, buildNotificationBody } from './notificationService';
import { getIO } from '../websocket/socket';
import { crearEventoDesdeReserva } from './calendarioWebhookService';

export async function processWebhookEvent(payload: WebhookPayload): Promise<{
  clienteId: number;
  suscripcionId: number | null;
  eventoId: number;
}> {
  const { event, saas, data } = payload;

  // Upsert client
  const cliente = await prisma.clienteGlobal.upsert({
    where: { email: data.cliente.email },
    update: {
      nombre: data.cliente.nombre,
      telefono: data.cliente.telefono,
      pais: data.cliente.pais,
      empresa: data.cliente.empresa,
      ultimaActualizacion: new Date(),
      metadata: data.metadata as any,
    },
    create: {
      email: data.cliente.email,
      nombre: data.cliente.nombre,
      telefono: data.cliente.telefono,
      pais: data.cliente.pais,
      empresa: data.cliente.empresa,
      origenSaas: saas,
      metadata: data.metadata as any,
    },
  });

  let suscripcionId: number | null = null;

  // Process calendar reservation events
  if (event === 'reserva_cita' && data.reserva) {
    try {
      const calendarioResult = await crearEventoDesdeReserva(payload);
      if (calendarioResult.success) {
        logger.info(`Evento de calendario creado desde reserva: ${calendarioResult.eventoId}`);
      } else {
        logger.warn(`No se pudo crear evento de calendario: ${calendarioResult.error}`);
      }
    } catch (error) {
      logger.error('Error creando evento de calendario desde reserva:', error);
    }
  }

  // Process subscription events
  if (data.suscripcion) {
    const sub = data.suscripcion;

    if (event === 'nuevo_registro' || event === 'reactivacion') {
      const suscripcion = await prisma.suscripcion.create({
        data: {
          clienteId: cliente.id,
          saas,
          planTipo: sub.plan,
          estado: sub.plan === 'trial' ? 'trial' : 'activa',
          monto: sub.monto,
          moneda: sub.moneda || 'EUR',
          fechaInicio: new Date(),
          diasTrialTotal: sub.plan === 'trial' ? (sub.duracion_dias || 14) : null,
          diasTrialRestantes: sub.plan === 'trial' ? (sub.duracion_dias || 14) : null,
          metodoPago: sub.metodo_pago,
          paymentProviderId: sub.payment_provider_id,
        },
      });
      suscripcionId = suscripcion.id;
    }

    if (event === 'pago_exitoso') {
      const activeSub = await prisma.suscripcion.findFirst({
        where: { clienteId: cliente.id, saas, estado: { in: ['activa', 'trial'] } },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSub) {
        suscripcionId = activeSub.id;
        await prisma.suscripcion.update({
          where: { id: activeSub.id },
          data: { estado: 'activa', fechaUltimoPago: new Date() },
        });

        await prisma.pago.create({
          data: {
            suscripcionId: activeSub.id,
            clienteId: cliente.id,
            monto: sub.monto,
            moneda: sub.moneda || 'EUR',
            estado: 'completado',
            metodoPago: sub.metodo_pago,
            paymentProviderId: sub.payment_provider_id,
            fechaPago: new Date(),
          },
        });
      }
    }

    if (event === 'pago_fallido') {
      const activeSub = await prisma.suscripcion.findFirst({
        where: { clienteId: cliente.id, saas, estado: 'activa' },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSub) {
        suscripcionId = activeSub.id;
        await prisma.pago.create({
          data: {
            suscripcionId: activeSub.id,
            clienteId: cliente.id,
            monto: sub.monto,
            moneda: sub.moneda || 'EUR',
            estado: 'fallido',
            metodoPago: sub.metodo_pago,
            fechaPago: new Date(),
          },
        });
      }
    }

    if (event === 'upgrade_plan' || event === 'downgrade_plan') {
      const activeSub = await prisma.suscripcion.findFirst({
        where: { clienteId: cliente.id, saas, estado: 'activa' },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSub) {
        suscripcionId = activeSub.id;
        await prisma.suscripcion.update({
          where: { id: activeSub.id },
          data: { planTipo: sub.plan, monto: sub.monto },
        });
      }
    }

    if (event === 'cancelacion') {
      const activeSub = await prisma.suscripcion.findFirst({
        where: { clienteId: cliente.id, saas, estado: { in: ['activa', 'trial'] } },
        orderBy: { createdAt: 'desc' },
      });

      if (activeSub) {
        suscripcionId = activeSub.id;
        await prisma.suscripcion.update({
          where: { id: activeSub.id },
          data: { estado: 'cancelada', fechaCancelacion: new Date() },
        });
      }

      await prisma.clienteGlobal.update({
        where: { id: cliente.id },
        data: { estado: 'inactivo' },
      });
    }
  }

  // Create event
  const evento = await prisma.evento.create({
    data: {
      tipo: event,
      severidad: ['pago_fallido', 'cancelacion'].includes(event) ? 'critico' : 'info',
      clienteId: cliente.id,
      suscripcionId,
      saas,
      datos: payload as any,
      ipOrigen: payload.data.metadata?.ip,
      userAgent: payload.data.metadata?.user_agent,
    },
  });

  // Send push notification
  await sendPushNotification({
    type: event,
    clienteId: cliente.id,
    saas,
    eventoId: evento.id,
    title: buildNotificationTitle(event, saas),
    body: buildNotificationBody(event, data.cliente.nombre, data.suscripcion?.monto),
  });

  // Emit to dashboard via WebSocket
  try {
    const io = getIO();
    io.emit('nuevo_evento', {
      id: evento.id,
      tipo: event,
      saas,
      cliente: { id: cliente.id, nombre: data.cliente.nombre, email: data.cliente.email },
      fecha: evento.fecha,
    });
  } catch {
    // Socket may not be initialized yet
  }

  // Mark as processed
  await prisma.evento.update({
    where: { id: evento.id },
    data: { procesado: true, notificadoPush: true, notificadoDashboard: true },
  });

  return { clienteId: cliente.id, suscripcionId, eventoId: evento.id };
}
