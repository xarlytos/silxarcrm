import OpenAI from 'openai';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { emitirEvento, enviarMensajeDirecto } from './whatsappWebJsService';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

export interface CreateChatbotReglaInput {
  softwareId: string;
  nombre: string;
  palabrasClave: string[];
  respuesta: string;
  tipo?: string;
  activa?: boolean;
}

export interface UpdateChatbotReglaInput {
  nombre?: string;
  palabrasClave?: string[];
  respuesta?: string;
  tipo?: string;
  activa?: boolean;
  orden?: number;
}

/* ============================================================
   CRUD de reglas
============================================================ */

export async function listReglas(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  return prisma.whatsappChatbotRegla.findMany({
    where,
    orderBy: [{ activa: 'desc' }, { orden: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getRegla(id: string) {
  return prisma.whatsappChatbotRegla.findUnique({ where: { id } });
}

export async function createRegla(input: CreateChatbotReglaInput) {
  if (!input.softwareId?.trim()) throw new Error('softwareId obligatorio');
  if (!input.nombre?.trim()) throw new Error('nombre obligatorio');
  if (!input.respuesta?.trim()) throw new Error('respuesta obligatoria');
  if (!input.palabrasClave?.length) throw new Error('palabrasClave obligatorias');

  const tipo = input.tipo || 'keyword';
  if (tipo !== 'keyword' && tipo !== 'ia') {
    throw new Error("tipo debe ser 'keyword' o 'ia'");
  }

  const max = await prisma.whatsappChatbotRegla.aggregate({
    where: { softwareId: input.softwareId },
    _max: { orden: true },
  });

  return prisma.whatsappChatbotRegla.create({
    data: {
      softwareId: input.softwareId,
      nombre: input.nombre.trim(),
      palabrasClave: input.palabrasClave.map((p) => p.toLowerCase().trim()).filter(Boolean),
      respuesta: input.respuesta.trim(),
      tipo,
      activa: input.activa ?? true,
      orden: (max._max.orden ?? 0) + 1,
    },
  });
}

export async function updateRegla(id: string, input: UpdateChatbotReglaInput) {
  const existing = await prisma.whatsappChatbotRegla.findUnique({ where: { id } });
  if (!existing) return null;

  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre.trim();
  if (input.palabrasClave !== undefined) {
    data.palabrasClave = input.palabrasClave.map((p) => p.toLowerCase().trim()).filter(Boolean);
  }
  if (input.respuesta !== undefined) data.respuesta = input.respuesta.trim();
  if (input.tipo !== undefined) {
    if (input.tipo !== 'keyword' && input.tipo !== 'ia') {
      throw new Error("tipo debe ser 'keyword' o 'ia'");
    }
    data.tipo = input.tipo;
  }
  if (input.activa !== undefined) data.activa = input.activa;
  if (input.orden !== undefined) data.orden = input.orden;

  return prisma.whatsappChatbotRegla.update({ where: { id }, data });
}

export async function deleteRegla(id: string) {
  const existing = await prisma.whatsappChatbotRegla.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.whatsappChatbotRegla.delete({ where: { id } });
  return existing;
}

/* ============================================================
   Procesamiento de mensajes entrantes
============================================================ */

export async function procesarMensajeEntrante(
  softwareId: string,
  numero: string,
  mensajeLead: string,
  leadId: string,
) {
  try {
    // Buscar reglas activas del software, ordenadas
    const reglas = await prisma.whatsappChatbotRegla.findMany({
      where: { softwareId, activa: true },
      orderBy: [{ orden: 'asc' }, { createdAt: 'desc' }],
    });

    if (reglas.length === 0) return; // Sin reglas = no responde

    const textoLower = mensajeLead.toLowerCase();
    let reglaAplicada = null;
    let respuesta = '';

    for (const regla of reglas) {
      if (regla.tipo === 'keyword') {
        // Buscar coincidencia de palabras clave
        const match = regla.palabrasClave.some((pk) => textoLower.includes(pk));
        if (match) {
          reglaAplicada = regla;
          respuesta = regla.respuesta;
          break;
        }
      }
      // Si tipo='ia', se evalúa al final como fallback si no hay keyword match
    }

    // Si no hubo match por keyword pero hay regla tipo 'ia', usar IA
    if (!reglaAplicada) {
      const reglaIA = reglas.find((r) => r.tipo === 'ia');
      if (reglaIA) {
        respuesta = await generarRespuestaIA(softwareId, leadId, mensajeLead, reglaIA.respuesta);
        reglaAplicada = reglaIA;
      }
    }

    if (!respuesta.trim()) return;

    // Enviar respuesta automática
    await enviarMensajeDirecto(softwareId, numero, respuesta, leadId, reglaAplicada?.id);

    // Registrar en DB
    await prisma.whatsappMensaje.create({
      data: {
        conversacion: {
          connectOrCreate: {
            where: { leadId },
            create: { leadId, softwareId },
          },
        },
        direccion: 'OUT',
        cuerpo: respuesta,
        iaGenerado: reglaAplicada?.tipo === 'ia',
        usuarioId: null,
      },
    });

    await prisma.whatsappConversacion.updateMany({
      where: { leadId },
      data: { ultimaActividad: new Date() },
    });

    emitirEvento(softwareId, 'wweb:chatbot_respuesta', {
      leadId,
      numero,
      respuesta,
      tipo: reglaAplicada?.tipo,
    });

    logger.info(`[${softwareId}] Chatbot respondió a ${numero}: ${respuesta.slice(0, 60)}...`);
  } catch (error) {
    logger.error(`[${softwareId}] Chatbot error:`, (error as Error).message);
  }
}

async function generarRespuestaIA(
  softwareId: string,
  leadId: string,
  mensajeLead: string,
  instruccionesContexto: string,
): Promise<string> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  const conv = await prisma.whatsappConversacion.findUnique({ where: { leadId } });
  const mensajesPrevios = conv
    ? await prisma.whatsappMensaje.findMany({
        where: { conversacionId: conv.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : [];

  const hilo = mensajesPrevios
    .reverse()
    .map((m) => `[${m.direccion === 'OUT' ? 'BOT' : 'LEAD'}] ${m.cuerpo}`)
    .join('\n');

  const system = `Eres un asistente automático de WhatsApp para un negocio.
Instrucciones del negocio:
${instruccionesContexto}

Reglas:
- Responde en español de España.
- Sé breve, cordial y directo (máximo 3-4 líneas).
- No inventes datos que no estén en el contexto.
- Si no sabes algo, deriva amablemente a hablar con un humano.
- Usa máximo 1 emoji.`;

  const userContent = `LEAD: ${lead?.nombre || 'Desconocido'}${lead?.empresa ? ` (${lead.empresa})` : ''}

HILO RECIENTE:
${hilo || '(sin mensajes previos)'}

MENSAJE DEL LEAD AHORA:
${mensajeLead}

Responde como el bot.`;

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (e: any) {
    logger.error('Chatbot IA error:', e?.message);
    return '';
  }
}
