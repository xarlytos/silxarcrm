import OpenAI from 'openai';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { rellenarVariables } from './spechService';

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export type Personalidad = 'resistente' | 'interesado' | 'ocupado' | 'curioso' | 'hostil';
export type Dificultad = 'facil' | 'medio' | 'dificil';

export interface LeadSimulado {
  nombre: string;
  empresa?: string;
  cargo?: string;
  personalidad: Personalidad;
  contexto: string;
  dificultad?: Dificultad;
}

interface MensajeChat {
  rol: 'agente' | 'cliente';
  texto: string;
  timestamp: string;
}

export interface IniciarSimulacionInput {
  softwareId: string;
  spechId?: string;
  leadSimulado: LeadSimulado;
  usuarioId?: number;
}

const PERSONALIDAD_DESCRIPCIONES: Record<Personalidad, string> = {
  resistente:
    'Pones objeciones (precio, tiempo, "ya tengo solucion"). Eres educado pero escuchas con escepticismo.',
  interesado:
    'Haces preguntas concretas sobre funcionalidades, integraciones y precio. Tono curioso y abierto.',
  ocupado:
    'Cortante. "Solo tengo 2 minutos". Pides que vayan al grano. Si no aportan valor en 30s, terminas.',
  curioso:
    'Quieres entender pero te pierdes en detalles tecnicos. Pides que te lo expliquen como si tuvieras 5 anos.',
  hostil:
    'Molesto por la llamada. "De donde sacaron mi numero?". Dificil de calmar pero no imposible.',
};

const DIFICULTAD_NIVEL: Record<Dificultad, string> = {
  facil: 'Eres facil de convencer. Si el agente hace bien su trabajo, cedes pronto.',
  medio: 'Cedes solo si el agente realmente convence con argumentos solidos.',
  dificil: 'Solo aceptas si el agente es excepcional. Pones varias objeciones antes de ceder.',
};

function buildSystemPrompt(lead: LeadSimulado, contenidoSpech: string | null): string {
  const personalidadDesc = PERSONALIDAD_DESCRIPCIONES[lead.personalidad];
  const dificultadDesc = DIFICULTAD_NIVEL[lead.dificultad || 'medio'];

  return `Eres ${lead.nombre}${lead.cargo ? `, ${lead.cargo}` : ''}${
    lead.empresa ? ` de ${lead.empresa}` : ''
  }. Eres un cliente potencial.

PERSONALIDAD: ${personalidadDesc}
NIVEL DIFICULTAD: ${dificultadDesc}
CONTEXTO/SITUACION ACTUAL: ${lead.contexto}

REGLAS ESTRICTAS:
1. Responde SIEMPRE en espanol natural, como hablaria una persona real por telefono.
2. Mantente fiel a tu personalidad durante toda la llamada.
3. Maximo 2-3 frases por respuesta.
4. No reveles toda tu informacion de golpe. Responde lo justo.
5. Pregunta de vuelta cuando algo te interesa.
6. Si el agente es agresivo o irrespetuoso, reacciona como una persona real.
7. No menciones que eres una IA. Eres ${lead.nombre}, un humano.
8. Si el agente te convence con argumentos solidos, puedes ceder y aceptar una demo.
${
  contenidoSpech
    ? `\nEL AGENTE ESTA SIGUIENDO ESTE GUION (no se lo reveles):\n---\n${contenidoSpech}\n---\n`
    : ''
}
Tu primera respuesta debe ser la de alguien que recibe una llamada comercial inesperada. Empieza por algo como "Si, ¿quien es?" o "Diga".`;
}

export async function iniciarSimulacion(input: IniciarSimulacionInput) {
  if (!openai) throw new Error('OpenAI no configurado');

  const spech = input.spechId
    ? await prisma.spechLlamada.findUnique({ where: { id: input.spechId } })
    : null;

  const sesion = await prisma.sesionPruebaIA.create({
    data: {
      softwareId: input.softwareId,
      spechId: input.spechId,
      usuarioId: input.usuarioId,
      leadSimulado: input.leadSimulado as any,
      mensajes: [],
      resultado: 'pendiente',
    },
  });

  const systemPrompt = buildSystemPrompt(input.leadSimulado, spech?.contenido || null);

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '[El telefono suena. Acabas de descolgar.]' },
    ],
    temperature: 0.85,
    max_tokens: 200,
  });

  const respuestaIa = completion.choices[0]?.message?.content?.trim() || 'Diga.';
  const mensajes: MensajeChat[] = [
    { rol: 'cliente', texto: respuestaIa, timestamp: new Date().toISOString() },
  ];

  await prisma.sesionPruebaIA.update({
    where: { id: sesion.id },
    data: { mensajes: mensajes as any },
  });

  return { sesion, mensajes };
}

export async function enviarMensaje(sesionId: string, textoAgente: string) {
  if (!openai) throw new Error('OpenAI no configurado');

  const sesion = await prisma.sesionPruebaIA.findUnique({
    where: { id: sesionId },
    include: { spech: true },
  });
  if (!sesion) return null;

  const mensajes = (sesion.mensajes as unknown as MensajeChat[]) || [];
  const lead = sesion.leadSimulado as unknown as LeadSimulado;
  const systemPrompt = buildSystemPrompt(lead, sesion.spech?.contenido || null);

  const chatHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const m of mensajes) {
    chatHistory.push({
      role: m.rol === 'agente' ? 'user' : 'assistant',
      content: m.texto,
    });
  }

  chatHistory.push({ role: 'user', content: textoAgente });

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: chatHistory,
    temperature: 0.85,
    max_tokens: 200,
  });

  const respuestaIa =
    completion.choices[0]?.message?.content?.trim() || '[silencio]';

  const nuevosMensajes: MensajeChat[] = [
    ...mensajes,
    { rol: 'agente', texto: textoAgente, timestamp: new Date().toISOString() },
    { rol: 'cliente', texto: respuestaIa, timestamp: new Date().toISOString() },
  ];

  await prisma.sesionPruebaIA.update({
    where: { id: sesionId },
    data: { mensajes: nuevosMensajes as any },
  });

  return { mensajes: nuevosMensajes, ultimaRespuesta: respuestaIa };
}

export async function finalizarSimulacion(sesionId: string) {
  if (!openai) throw new Error('OpenAI no configurado');

  const sesion = await prisma.sesionPruebaIA.findUnique({
    where: { id: sesionId },
    include: { spech: true },
  });
  if (!sesion) return null;

  const mensajes = (sesion.mensajes as unknown as MensajeChat[]) || [];
  const transcripcion = mensajes
    .map((m) => `${m.rol === 'agente' ? 'AGENTE' : 'CLIENTE'}: ${m.texto}`)
    .join('\n');

  const feedbackPrompt = `Eres un coach de ventas con 20 anos de experiencia.

Analiza esta simulacion de llamada comercial entre un agente y un cliente.

GUION QUE DEBIA SEGUIR EL AGENTE:
${sesion.spech?.contenido || '(sin guion asignado)'}

CONVERSACION:
${transcripcion}

Devuelve EXCLUSIVAMENTE un objeto JSON con esta estructura:
{
  "puntuacionGlobal": <int 1-10>,
  "puntuaciones": {
    "apertura": <int 1-10>,
    "guion": <int 1-10>,
    "escucha": <int 1-10>,
    "objeciones": <int 1-10>,
    "cierre": <int 1-10>,
    "tono": <int 1-10>
  },
  "puntosFuertes": ["...", "..."],
  "puntosMejorar": ["...", "..."],
  "feedback": "Texto explicativo con consejos concretos.",
  "proximoPaso": "Que deberia practicar la siguiente vez"
}

Reglas:
- Lenguaje natural en espanol.
- Se constructivo: senala lo bueno y lo mejorable.
- Si la conversacion es muy corta o pobre, baja la puntuacion.
- No anadas texto fuera del JSON.`;

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [{ role: 'system', content: feedbackPrompt }],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: 'json_object' },
  });

  let feedback: any = {};
  try {
    feedback = JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (err) {
    logger.error('Feedback parse error:', err);
    feedback = {
      puntuacionGlobal: 5,
      feedback: 'No fue posible analizar la simulacion.',
    };
  }

  const resultado =
    (feedback.puntuacionGlobal || 0) >= 7 ? 'exitoso' : 'fallido';

  const updated = await prisma.sesionPruebaIA.update({
    where: { id: sesionId },
    data: {
      feedback,
      resultado,
    },
    include: { spech: true },
  });

  return { sesion: updated, feedback };
}

export async function listSimulaciones(filtros: {
  softwareId?: string;
  usuarioId?: number;
  page?: number;
  limit?: number;
}) {
  const { softwareId, usuarioId, page = 1, limit = 20 } = filtros;
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  if (usuarioId !== undefined) where.usuarioId = usuarioId;

  const [items, total] = await Promise.all([
    prisma.sesionPruebaIA.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { spech: { select: { titulo: true } } },
    }),
    prisma.sesionPruebaIA.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getSimulacion(id: string) {
  return prisma.sesionPruebaIA.findUnique({
    where: { id },
    include: { spech: true },
  });
}

export async function deleteSimulacion(id: string) {
  const existing = await prisma.sesionPruebaIA.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.sesionPruebaIA.delete({ where: { id } });
  return existing;
}

// Helper: aplicar variables sobre el spech con datos del lead simulado
export function spechRellenado(contenido: string, lead: LeadSimulado): string {
  return rellenarVariables(contenido, {
    nombre: lead.nombre,
    empresa: lead.empresa || null,
    cargo: lead.cargo || null,
    telefono: null,
  });
}
