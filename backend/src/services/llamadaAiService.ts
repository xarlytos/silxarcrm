import { prisma } from '../config/database';
import { LeadEstado } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getIO } from '../websocket/socket';
import axios from 'axios';

export interface IniciarLlamadaAIInput {
  leadId: string;
  spechId?: string;
  agenteId: number;
}

export interface AIWebhookPayload {
  event: string;
  llamadaId?: string;
  callSid?: string;
  sessionId?: string;
  estado?: string;
  phone?: string;
  softwareId?: string;
  leadId?: string;
  outcome?: string;
  transcript?: any[];
  durationS?: number;
  grabacionUrl?: string;
  metadata?: any;
  timestamp?: string;
  // Datos enriquecidos del Nurture Engine (post-call)
  emotion?: string;
  engagementScore?: number;
  frustrationLevel?: number;
  bantScore?: {
    budget: number;
    authority: number;
    need: number;
    timeline: number;
  };
  actionItems?: string[];
  followUpType?: string;
  recordatoriosProgramados?: number;
}

function emit(softwareId: string, evento: string, payload: any) {
  try {
    getIO().to(`saas:${softwareId}`).emit(evento, payload);
    getIO().to(`llamadas`).emit(evento, payload);
  } catch (err) {
    // Socket no inicializado todavia
  }
}

/**
 * Inicia una llamada AI disparando el servicio Python.
 * Crea el registro en DB y luego envia la peticion al agente.
 */
export async function iniciarLlamadaAI(input: IniciarLlamadaAIInput) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
  });
  if (!lead) throw new Error('Lead no encontrado');
  if (!lead.telefono) throw new Error('El lead no tiene telefono');

  const spech = input.spechId
    ? await prisma.spechLlamada.findUnique({ where: { id: input.spechId } })
    : null;

  // Crear registro en DB
  const llamada = await prisma.llamadaReal.create({
    data: {
      softwareId: lead.softwareId,
      leadId: lead.id,
      spechId: spech?.id || null,
      agenteId: input.agenteId,
      telefonoLead: lead.telefono,
      estado: 'ai_conectando',
      direccion: 'saliente',
      modo: 'AI',
      leadEstadoPrev: lead.estado,
    },
  });

  try {
    // Disparar servicio Python
    const aiAgentUrl = (env as any).AI_AGENT_URL || 'http://localhost:8000';
    const aiAgentSecret = (env as any).AI_AGENT_SECRET || '';

    const resp = await axios.post(
      `${aiAgentUrl}/outbound`,
      {
        phone: lead.telefono,
        softwareId: lead.softwareId,
        leadId: lead.id,
        llamadaId: llamada.id,
        spechId: spech?.id,
        businessType: (lead.metadata as any)?.businessType || (lead.metadata as any)?.sector || 'generico',
        businessName: lead.empresa || lead.nombre,
        city: lead.pais || '',
        agenteId: input.agenteId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(aiAgentSecret ? { 'X-Agent-Secret': aiAgentSecret } : {}),
        },
        timeout: 15000,
      }
    );

    const aiData = resp.data;

    // Actualizar con datos del AI
    const updated = await prisma.llamadaReal.update({
      where: { id: llamada.id },
      data: {
        aiCallSid: aiData?.callSid || aiData?.call_sid || null,
        iniciadaAt: new Date(),
      },
      include: {
        lead: { select: { id: true, nombre: true, email: true, empresa: true } },
        spech: { select: { id: true, titulo: true } },
        agente: { select: { id: true, nombre: true } },
      },
    });

    emit(lead.softwareId, 'llamada:estado', {
      llamadaId: llamada.id,
      estado: 'ai_conectando',
      modo: 'AI',
    });

    return updated;
  } catch (err) {
    logger.error('Error iniciando llamada AI:', err);

    await prisma.llamadaReal.update({
      where: { id: llamada.id },
      data: {
        estado: 'fallida',
        notasPost: `Error iniciando llamada AI: ${(err as Error).message}`,
        terminadaAt: new Date(),
      },
    });

    emit(lead.softwareId, 'llamada:estado', {
      llamadaId: llamada.id,
      estado: 'fallida',
      modo: 'AI',
      error: (err as Error).message,
    });

    throw err;
  }
}

/**
 * Procesa webhook de estado del servicio Python.
 */
export async function procesarWebhookAI(payload: AIWebhookPayload) {
  const {
    event,
    llamadaId,
    callSid,
    estado,
    softwareId,
    leadId,
    outcome,
    transcript,
    durationS,
    grabacionUrl,
    metadata,
  } = payload;

  if (!llamadaId && !callSid) {
    logger.warn('Webhook AI sin llamadaId ni callSid', payload);
    return;
  }

  // Buscar la llamada
  const where: any = {};
  if (llamadaId) where.id = llamadaId;
  else where.aiCallSid = callSid;

  const llamada = await prisma.llamadaReal.findFirst({ where });
  if (!llamada) {
    logger.warn(`Webhook AI para llamada desconocida: ${llamadaId || callSid}`, payload);
    return;
  }

  const update: any = {
    metadata: {
      ...((llamada.metadata as any) || {}),
      [`ai_${event}`]: payload,
    },
  };

  if (estado) {
    update.estado = estado;
    if (estado === 'en_curso' && !llamada.iniciadaAt) {
      update.iniciadaAt = new Date();
    }
    if (
      estado === 'completada' ||
      estado === 'fallida' ||
      estado === 'no_contesta' ||
      estado === 'cancelada' ||
      estado === 'rechazado' ||
      estado === 'optout' ||
      estado === 'transferido'
    ) {
      update.terminadaAt = new Date();
    }
  }

  if (outcome) {
    update.estado = outcome;
    update.terminadaAt = new Date();
  }

  if (durationS !== undefined) update.duracionSeg = durationS;
  if (grabacionUrl) update.grabacionUrl = grabacionUrl;
  if (transcript) update.transcript = JSON.stringify(transcript);
  if (callSid) update.aiCallSid = callSid;

  // Guardar datos enriquecidos del Nurture Engine en metadata
  const enrichedMetadata: any = {
    ...((llamada.metadata as any) || {}),
    ...((update.metadata as any) || {}),
  };
  if (payload.emotion) enrichedMetadata.emotion = payload.emotion;
  if (payload.engagementScore !== undefined) enrichedMetadata.engagementScore = payload.engagementScore;
  if (payload.frustrationLevel !== undefined) enrichedMetadata.frustrationLevel = payload.frustrationLevel;
  if (payload.bantScore) enrichedMetadata.bantScore = payload.bantScore;
  if (payload.actionItems) enrichedMetadata.actionItems = payload.actionItems;
  if (payload.followUpType) enrichedMetadata.followUpType = payload.followUpType;
  if (payload.recordatoriosProgramados !== undefined) enrichedMetadata.recordatoriosProgramados = payload.recordatoriosProgramados;

  update.metadata = enrichedMetadata;

  const updated = await prisma.llamadaReal.update({
    where: { id: llamada.id },
    data: update,
  });

  // Emitir por Socket.IO
  emit(llamada.softwareId, 'llamada:estado', {
    llamadaId: llamada.id,
    estado: update.estado || llamada.estado,
    modo: 'AI',
    duracionSeg: update.duracionSeg,
    outcome: outcome || null,
  });

  // Si hay grabacion, emitir evento
  if (grabacionUrl) {
    emit(llamada.softwareId, 'llamada:grabacion', {
      llamadaId: llamada.id,
      grabacionUrl,
    });
  }

  // Si la llamada termino con outcome, actualizar lead
  if (outcome && leadId) {
    let nuevoEstado: LeadEstado | undefined;
    let descripcion = '';

    if (outcome === 'demo_agendada') {
      nuevoEstado = 'INTERESADO';
      descripcion = 'Demo agendada via llamada AI';
    } else if (outcome === 'transferido') {
      nuevoEstado = 'CALIFICADO';
      descripcion = 'Lead transfirio a humano via llamada AI';
    } else if (outcome === 'rechazado' || outcome === 'optout') {
      nuevoEstado = 'RECHAZADO';
      descripcion = `Lead rechazo/optout via llamada AI (${outcome})`;
    } else if (outcome === 'completada') {
      nuevoEstado = 'CONTACTADO';
      descripcion = 'Llamada AI completada';
    }

    // Enriquecer descripción con datos del Nurture Engine
    const bant = payload.bantScore;
    if (bant) {
      descripcion += ` | BANT: B${bant.budget}/A${bant.authority}/N${bant.need}/T${bant.timeline}`;
    }
    if (payload.emotion) {
      descripcion += ` | Emocion: ${payload.emotion}`;
    }
    if (payload.engagementScore !== undefined) {
      descripcion += ` | Engagement: ${payload.engagementScore}%`;
    }
    if (payload.actionItems && payload.actionItems.length > 0) {
      descripcion += ` | Actions: ${payload.actionItems.join(', ')}`;
    }

    if (nuevoEstado) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          estado: nuevoEstado,
          ultimoContacto: new Date(),
        },
      });

      await prisma.leadHistorial.create({
        data: {
          leadId,
          tipo: 'llamada_ai',
          descripcion,
          usuarioId: llamada.agenteId,
        },
      });

      await prisma.llamadaReal.update({
        where: { id: llamada.id },
        data: { leadEstadoPost: nuevoEstado },
      });
    }
  }

  return updated;
}

// === Simulador de conversación AI por texto ===

export async function iniciarSimulacionAI(input: {
  softwareId: string;
  leadId: string;
  spechId?: string;
  agenteId: number;
}) {
  const aiAgentUrl = (env as any).AI_AGENT_URL || 'http://localhost:8000';
  const aiAgentSecret = (env as any).AI_AGENT_SECRET || '';

  const resp = await axios.post(
    `${aiAgentUrl}/simulate/start`,
    {
      softwareId: input.softwareId,
      leadId: input.leadId,
      spechId: input.spechId,
      agenteId: input.agenteId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(aiAgentSecret ? { 'X-Agent-Secret': aiAgentSecret } : {}),
      },
      timeout: 30000,
    }
  );
  return resp.data;
}

export async function enviarMensajeSimulacionAI(
  sid: string,
  text: string
) {
  const aiAgentUrl = (env as any).AI_AGENT_URL || 'http://localhost:8000';
  const aiAgentSecret = (env as any).AI_AGENT_SECRET || '';

  const resp = await axios.post(
    `${aiAgentUrl}/simulate/${sid}/message`,
    { text },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(aiAgentSecret ? { 'X-Agent-Secret': aiAgentSecret } : {}),
      },
      timeout: 30000,
    }
  );
  return resp.data;
}
