import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { WebhookPayload } from '../types/webhook';

/**
 * Crea un evento en el calendario cuando se recibe una reserva de cita vía webhook
 */
export async function crearEventoDesdeReserva(
  payload: WebhookPayload
): Promise<{ success: boolean; eventoId?: string; error?: string }> {
  try {
    const { event, saas, data, timestamp } = payload;

    if (event !== 'reserva_cita') {
      return { success: false, error: 'Evento no es una reserva de cita' };
    }

    if (!data.reserva) {
      return { success: false, error: 'Datos de reserva no proporcionados' };
    }

    const { cliente, reserva } = data;
    const fechaReserva = new Date(reserva.fecha);

    // Calcular fecha fin basada en la duración
    const fechaFin = new Date(fechaReserva);
    fechaFin.setMinutes(fechaFin.getMinutes() + (reserva.duracion_minutos || 60));

    // Determinar el color basado en el SaaS
    const colorPorSaas: Record<string, any> = {
      'entrenadores': 'blue',
      'nutricion': 'green',
      'default': 'purple'
    };

    // Determinar asignación (podría venir de configuración o metadata)
    // Por defecto asignamos a "ambos" para que ambos socios vean la cita
    const asignadoA = 'ambos';

    // Crear título descriptivo
    const titulo = reserva.motivo
      ? `Cita: ${reserva.motivo}`
      : `Reserva - ${cliente.nombre}`;

    // Crear descripción con toda la información
    const descripcionLines = [
      `👤 Cliente: ${cliente.nombre}`,
      `📧 Email: ${cliente.email}`,
    ];

    if (cliente.telefono) {
      descripcionLines.push(`📞 Teléfono: ${cliente.telefono}`);
    }

    descripcionLines.push(
      `🖥️ Software: ${saas}`,
      `⏱️ Duración: ${reserva.duracion_minutos || 60} minutos`
    );

    if (reserva.ubicacion) {
      descripcionLines.push(`📍 Ubicación: ${reserva.ubicacion}`);
    }

    if (reserva.notas) {
      descripcionLines.push(`📝 Notas: ${reserva.notas}`);
    }

    descripcionLines.push(
      '',
      `---`,
      `Reserva automática desde webhook`,
      `ID: ${payload.webhook_id}`
    );

    const evento = await prisma.calendarioEvento.create({
      data: {
        titulo,
        descripcion: descripcionLines.join('\n'),
        fechaInicio: fechaReserva,
        fechaFin: fechaFin,
        todoElDia: false,
        asignadoA,
        color: colorPorSaas[saas] || colorPorSaas.default,
        creadoPor: `webhook:${saas}`,
      },
    });

    logger.info(`Evento de calendario creado desde reserva: ${evento.id} - ${cliente.nombre} - ${saas}`);

    return { success: true, eventoId: evento.id };
  } catch (error) {
    logger.error('Error creando evento desde reserva:', error);
    return { success: false, error: 'Error interno al crear evento' };
  }
}

/**
 * Actualiza un evento existente si la reserva se modifica
 */
export async function actualizarEventoDesdeReserva(
  payload: WebhookPayload,
  eventoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, saas } = payload;
    const { cliente, reserva } = data;

    if (!reserva) {
      return { success: false, error: 'Datos de reserva no proporcionados' };
    }

    const fechaReserva = new Date(reserva.fecha);
    const fechaFin = new Date(fechaReserva);
    fechaFin.setMinutes(fechaFin.getMinutes() + (reserva.duracion_minutos || 60));

    const titulo = reserva.motivo
      ? `Cita: ${reserva.motivo}`
      : `Reserva - ${cliente.nombre}`;

    await prisma.calendarioEvento.update({
      where: { id: eventoId },
      data: {
        titulo,
        fechaInicio: fechaReserva,
        fechaFin: fechaFin,
        descripcion: `👤 Cliente: ${cliente.nombre}\n📧 Email: ${cliente.email}\n🖥️ Software: ${saas}\n⏱️ Duración: ${reserva.duracion_minutos || 60} minutos\n📍 Ubicación: ${reserva.ubicacion || 'No especificada'}\n\n---\nActualizado desde webhook`,
      },
    });

    logger.info(`Evento de calendario actualizado: ${eventoId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error actualizando evento desde reserva:', error);
    return { success: false, error: 'Error interno' };
  }
}

/**
 * Cancela un evento de calendario cuando se cancela la reserva
 */
export async function cancelarEventoDesdeReserva(
  eventoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.calendarioEvento.delete({
      where: { id: eventoId },
    });

    logger.info(`Evento de calendario cancelado y eliminado: ${eventoId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error cancelando evento:', error);
    return { success: false, error: 'Error interno' };
  }
}

/**
 * Busca un evento existente por el ID del webhook
 * Esto permite actualizar/cancelar reservas existentes
 */
export async function buscarEventoPorWebhookId(
  webhookId: string
): Promise<string | null> {
  try {
    const evento = await prisma.calendarioEvento.findFirst({
      where: {
        descripcion: {
          contains: webhookId,
        },
      },
    });

    return evento?.id || null;
  } catch (error) {
    logger.error('Error buscando evento por webhook ID:', error);
    return null;
  }
}
