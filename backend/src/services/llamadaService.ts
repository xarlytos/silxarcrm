import { prisma } from '../config/database';
import { LeadEstado } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { clickToCall, ZadarmaWebhookEvent } from './zadarmaService';
import { getIO } from '../websocket/socket';

export type LlamadaEstado =
  | 'iniciando'
  | 'esperando_agente'
  | 'agente_descolgo'
  | 'llamando_lead'
  | 'en_curso'
  | 'completada'
  | 'fallida'
  | 'no_contesta'
  | 'cancelada';

export interface IniciarLlamadaInput {
  leadId: string;
  spechId?: string;
  telefonoAgente?: string;
  agenteId: number;
}

function emit(softwareId: string, evento: string, payload: any) {
  try {
    getIO().to(`saas:${softwareId}`).emit(evento, payload);
    getIO().to(`llamadas`).emit(evento, payload);
  } catch (err) {
    // Socket no inicializado todavia (tests)
  }
}

export async function iniciarLlamada(input: IniciarLlamadaInput) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new Error('Lead no encontrado');
  if (!lead.telefono) throw new Error('El lead no tiene telefono');

  const spech = input.spechId
    ? await prisma.spechLlamada.findUnique({ where: { id: input.spechId } })
    : null;

  const telefonoAgente =
    input.telefonoAgente?.trim() || env.ZADARMA_DEFAULT_AGENT_PHONE || '';
  if (!telefonoAgente) {
    throw new Error('Falta telefono del agente (ZADARMA_DEFAULT_AGENT_PHONE)');
  }

  const llamada = await prisma.llamadaReal.create({
    data: {
      softwareId: lead.softwareId,
      leadId: lead.id,
      spechId: spech?.id,
      agenteId: input.agenteId,
      telefonoLead: lead.telefono,
      telefonoAgente,
      estado: 'iniciando',
      direccion: 'saliente',
      leadEstadoPrev: lead.estado,
    },
  });

  try {
    const zadarmaResp = await clickToCall({
      from: telefonoAgente,
      to: lead.telefono,
      predicted: false,
    });

    await prisma.llamadaReal.update({
      where: { id: llamada.id },
      data: {
        estado: 'esperando_agente',
        iniciadaAt: new Date(),
        zadarmaCallId: zadarmaResp?.call_id?.toString() || null,
        metadata: zadarmaResp,
      },
    });

    emit(lead.softwareId, 'llamada:estado', {
      llamadaId: llamada.id,
      estado: 'esperando_agente',
    });

    return await prisma.llamadaReal.findUnique({
      where: { id: llamada.id },
      include: { lead: true, spech: true },
    });
  } catch (err) {
    logger.error('Zadarma click-to-call error:', err);
    await prisma.llamadaReal.update({
      where: { id: llamada.id },
      data: {
        estado: 'fallida',
        notasPost: `Error iniciando llamada: ${(err as Error).message}`,
      },
    });
    emit(lead.softwareId, 'llamada:estado', {
      llamadaId: llamada.id,
      estado: 'fallida',
      error: (err as Error).message,
    });
    throw err;
  }
}

export async function listLlamadas(filtros: {
  softwareId?: string;
  leadId?: string;
  agenteId?: number;
  estado?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}) {
  const { softwareId, leadId, agenteId, estado, desde, hasta, page = 1, limit = 25 } = filtros;
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  if (leadId) where.leadId = leadId;
  if (agenteId !== undefined) where.agenteId = agenteId;
  if (estado) where.estado = estado;
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) where.createdAt.lte = new Date(hasta);
  }

  const [items, total] = await Promise.all([
    prisma.llamadaReal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lead: { select: { id: true, nombre: true, email: true, empresa: true } },
        spech: { select: { id: true, titulo: true } },
        agente: { select: { id: true, nombre: true } },
      },
    }),
    prisma.llamadaReal.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getLlamada(id: string) {
  return prisma.llamadaReal.findUnique({
    where: { id },
    include: {
      lead: true,
      spech: true,
      agente: { select: { id: true, nombre: true, email: true } },
    },
  });
}

export async function actualizarNotasLlamada(
  id: string,
  data: {
    notasPost?: string;
    calificacion?: number;
    proximaAccion?: string;
    nuevoEstadoLead?: LeadEstado;
  }
) {
  const llamada = await prisma.llamadaReal.findUnique({ where: { id } });
  if (!llamada) return null;

  const updated = await prisma.llamadaReal.update({
    where: { id },
    data: {
      notasPost: data.notasPost,
      calificacion: data.calificacion,
      proximaAccion: data.proximaAccion,
      leadEstadoPost: data.nuevoEstadoLead,
    },
  });

  if (data.nuevoEstadoLead) {
    await prisma.lead.update({
      where: { id: llamada.leadId },
      data: {
        estado: data.nuevoEstadoLead,
        ultimoContacto: new Date(),
      },
    });
    await prisma.leadHistorial.create({
      data: {
        leadId: llamada.leadId,
        tipo: 'llamada',
        descripcion: `Llamada finalizada (${updated.estado}). ${
          data.notasPost || ''
        }`.trim(),
        usuarioId: llamada.agenteId,
      },
    });
  }

  return updated;
}

export async function deleteLlamada(id: string) {
  const existing = await prisma.llamadaReal.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.llamadaReal.delete({ where: { id } });
  return existing;
}

// === Webhooks Zadarma ===

function mapEventoToEstado(evento: string, disposition?: string): LlamadaEstado | null {
  if (evento === 'NOTIFY_START' || evento === 'notify_start') return 'esperando_agente';
  if (evento === 'NOTIFY_INTERNAL' || evento === 'notify_internal') return 'agente_descolgo';
  if (evento === 'NOTIFY_OUT_START' || evento === 'notify_out_start') return 'llamando_lead';
  if (evento === 'NOTIFY_ANSWER' || evento === 'notify_answer') return 'en_curso';
  if (evento === 'NOTIFY_END' || evento === 'notify_end') {
    if (disposition === 'no answer' || disposition === 'busy' || disposition === 'failed') {
      return 'no_contesta';
    }
    if (disposition === 'cancel') return 'cancelada';
    if (disposition === 'answered') return 'completada';
    return 'completada';
  }
  if (evento === 'NOTIFY_RECORD' || evento === 'notify_record') return null;
  return null;
}

export async function procesarWebhookZadarma(payload: ZadarmaWebhookEvent) {
  const callId = payload.call_id || payload.pbx_call_id;
  if (!callId) {
    logger.warn('Webhook Zadarma sin call_id', payload);
    return null;
  }

  const llamada = await prisma.llamadaReal.findFirst({
    where: { zadarmaCallId: callId.toString() },
  });

  if (!llamada) {
    logger.warn(`Webhook Zadarma para call_id desconocido: ${callId}`, payload);
    return null;
  }

  const evento = payload.event || '';
  const nuevoEstado = mapEventoToEstado(evento, payload.disposition);
  const update: any = {
    metadata: {
      ...((llamada.metadata as any) || {}),
      [`webhook_${evento}`]: payload,
    },
  };

  if (nuevoEstado) {
    update.estado = nuevoEstado;
    if (nuevoEstado === 'en_curso' && !llamada.iniciadaAt) {
      update.iniciadaAt = new Date();
    }
    if (
      nuevoEstado === 'completada' ||
      nuevoEstado === 'no_contesta' ||
      nuevoEstado === 'cancelada' ||
      nuevoEstado === 'fallida'
    ) {
      update.terminadaAt = new Date();
      if (payload.duration) update.duracionSeg = parseInt(payload.duration);
    }
  }

  if (payload.recording_url || payload.is_recorded) {
    if (payload.recording_url) update.grabacionUrl = payload.recording_url;
  }

  const updated = await prisma.llamadaReal.update({
    where: { id: llamada.id },
    data: update,
  });

  if (nuevoEstado) {
    emit(llamada.softwareId, 'llamada:estado', {
      llamadaId: llamada.id,
      estado: nuevoEstado,
      duracionSeg: update.duracionSeg,
    });
  }
  if (update.grabacionUrl) {
    emit(llamada.softwareId, 'llamada:grabacion', {
      llamadaId: llamada.id,
      grabacionUrl: update.grabacionUrl,
    });
  }

  return updated;
}

// === Estadisticas ===

export async function getStatsLlamadas(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - 7);
  inicioSemana.setHours(0, 0, 0, 0);

  const [total, hoy, semana, completadas, porEstado, durMedia] = await Promise.all([
    prisma.llamadaReal.count({ where }),
    prisma.llamadaReal.count({
      where: { ...where, createdAt: { gte: inicioHoy } },
    }),
    prisma.llamadaReal.count({
      where: { ...where, createdAt: { gte: inicioSemana } },
    }),
    prisma.llamadaReal.count({
      where: { ...where, estado: 'completada' },
    }),
    prisma.llamadaReal.groupBy({
      by: ['estado'],
      where,
      _count: { estado: true },
    }),
    prisma.llamadaReal.aggregate({
      where: { ...where, estado: 'completada' },
      _avg: { duracionSeg: true },
    }),
  ]);

  const tasaContacto = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return {
    total,
    hoy,
    semana,
    completadas,
    porEstado,
    duracionMediaSeg: Math.round(durMedia._avg.duracionSeg || 0),
    tasaContactoPct: tasaContacto,
  };
}
