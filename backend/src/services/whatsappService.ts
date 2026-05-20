import OpenAI from 'openai';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

export interface CreatePlantillaInput {
  softwareId: string;
  nombre: string;
  contenido: string;
  categoria?: string;
  activa?: boolean;
}

export interface UpdatePlantillaInput {
  nombre?: string;
  contenido?: string;
  categoria?: string;
  activa?: boolean;
  orden?: number;
}

export interface EnviarInput {
  leadId: string;
  plantillaId?: string;
  /** Texto final con variables ya rellenadas. Si se pasa, se respeta tal cual. */
  contenidoFinal?: string;
  usuarioId?: number;
}

const VAR_REGEX = /\{\{\s*(\w+)\s*\}\}/g;

const CATEGORIAS_VALIDAS = new Set([
  'general',
  'bienvenida',
  'follow_up',
  'recordatorio',
  'agradecimiento',
  'oferta',
  'reactivacion',
]);

export function extractVariables(contenido: string): string[] {
  const vars = new Set<string>();
  let m: RegExpExecArray | null;
  const regex = new RegExp(VAR_REGEX.source, 'g');
  while ((m = regex.exec(contenido)) !== null) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

export function rellenarVariables(
  contenido: string,
  vars: Record<string, string | null | undefined>,
): string {
  return contenido.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
    const value = vars[key];
    if (value === null || value === undefined || value === '') return `{{${key}}}`;
    return String(value);
  });
}

export function renderPlantillaParaLead(contenido: string, lead: any): string {
  const nombre = (lead.nombre || '').trim();
  const vars: Record<string, string | null | undefined> = {
    nombre: nombre || null,
    primer_nombre: nombre.split(/\s+/)[0] || null,
    email: lead.email,
    empresa: lead.empresa,
    cargo: lead.cargo,
    pais: lead.pais,
    estado: lead.estado,
    telefono: lead.telefono,
  };
  return rellenarVariables(contenido, vars);
}

/** Normaliza un teléfono para wa.me: solo dígitos. */
export function normalizarTelefono(raw: string): string {
  return (raw || '').replace(/[^\d]/g, '');
}

/* ============================================================
   Plantillas — CRUD
============================================================ */

export async function listPlantillas(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  return prisma.whatsappPlantilla.findMany({
    where,
    orderBy: [{ activa: 'desc' }, { orden: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function getPlantilla(id: string) {
  return prisma.whatsappPlantilla.findUnique({ where: { id } });
}

export async function createPlantilla(input: CreatePlantillaInput) {
  if (!input.softwareId?.trim()) throw new Error('softwareId obligatorio');
  if (!input.nombre?.trim()) throw new Error('nombre obligatorio');
  if (!input.contenido?.trim()) throw new Error('contenido obligatorio');

  const categoria = (input.categoria || 'general').toLowerCase();
  if (!CATEGORIAS_VALIDAS.has(categoria)) {
    throw new Error(`Categoría no válida. Debe ser una de: ${[...CATEGORIAS_VALIDAS].join(', ')}`);
  }

  const max = await prisma.whatsappPlantilla.aggregate({
    where: { softwareId: input.softwareId },
    _max: { orden: true },
  });

  return prisma.whatsappPlantilla.create({
    data: {
      softwareId: input.softwareId,
      nombre: input.nombre.trim(),
      contenido: input.contenido,
      categoria,
      variables: extractVariables(input.contenido),
      activa: input.activa ?? true,
      orden: (max._max.orden ?? 0) + 1,
    },
  });
}

export async function updatePlantilla(id: string, input: UpdatePlantillaInput) {
  const existing = await prisma.whatsappPlantilla.findUnique({ where: { id } });
  if (!existing) return null;

  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre.trim();
  if (input.contenido !== undefined) {
    data.contenido = input.contenido;
    data.variables = extractVariables(input.contenido);
  }
  if (input.categoria !== undefined) {
    const cat = input.categoria.toLowerCase();
    if (!CATEGORIAS_VALIDAS.has(cat)) {
      throw new Error(`Categoría no válida. Debe ser una de: ${[...CATEGORIAS_VALIDAS].join(', ')}`);
    }
    data.categoria = cat;
  }
  if (input.activa !== undefined) data.activa = input.activa;
  if (input.orden !== undefined) data.orden = input.orden;

  return prisma.whatsappPlantilla.update({ where: { id }, data });
}

export async function deletePlantilla(id: string) {
  const existing = await prisma.whatsappPlantilla.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.whatsappPlantilla.delete({ where: { id } });
  return existing;
}

/* ============================================================
   Envíos — generar link y registrar
============================================================ */

/**
 * Genera la URL wa.me para un lead+plantilla y registra el envío de forma atómica
 * (envío + entrada en historial + actualización de ultimoContacto del lead).
 */
export async function enviarWhatsapp(input: EnviarInput) {
  if (!input.leadId?.trim()) throw new Error('leadId obligatorio');

  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new Error('Lead no encontrado');
  if (!lead.telefono?.trim()) throw new Error('El lead no tiene teléfono');

  const telefono = normalizarTelefono(lead.telefono);
  if (telefono.length < 7) throw new Error('Teléfono inválido tras normalizar');

  // Resolver mensaje final
  let mensajeFinal = input.contenidoFinal;
  let plantillaIdFinal = input.plantillaId;
  let varianteId: string | undefined;
  let testId: string | undefined;

  if (!mensajeFinal && plantillaIdFinal) {
    const plantilla = await prisma.whatsappPlantilla.findUnique({
      where: { id: plantillaIdFinal },
    });
    if (!plantilla) throw new Error('Plantilla no encontrada');
    if (!plantilla.activa) throw new Error('Plantilla inactiva');
    mensajeFinal = renderPlantillaParaLead(plantilla.contenido, lead);
  }

  // Si no hay plantilla específica, intentar resolver vía A/B test
  if (!mensajeFinal && lead.softwareId) {
    const ab = await resolverPlantillaAB(lead.softwareId, 'general');
    if (ab) {
      const plantilla = await prisma.whatsappPlantilla.findUnique({
        where: { id: ab.plantillaId },
      });
      if (plantilla && plantilla.activa) {
        plantillaIdFinal = ab.plantillaId;
        varianteId = ab.varianteId;
        testId = ab.testId;
        mensajeFinal = renderPlantillaParaLead(plantilla.contenido, lead);
      }
    }
  }

  if (!mensajeFinal?.trim()) throw new Error('Se requiere mensaje o plantilla');

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensajeFinal)}`;

  // Incrementar contador A/B si aplica
  if (varianteId) {
    await incrementarEnvioVariante(varianteId);
  }

  // Transacción: envío + historial + último contacto
  const [envio] = await prisma.$transaction([
    prisma.whatsappEnvio.create({
      data: {
        leadId: input.leadId,
        plantillaId: plantillaIdFinal || null,
        varianteId: varianteId || null,
        telefono,
        mensaje: mensajeFinal,
        usuarioId: input.usuarioId || null,
      },
    }),
    prisma.leadHistorial.create({
      data: {
        leadId: input.leadId,
        tipo: 'whatsapp',
        descripcion: `WhatsApp enviado al ${telefono}`,
        usuarioId: input.usuarioId || null,
      },
    }),
    prisma.lead.update({
      where: { id: input.leadId },
      data: { ultimoContacto: new Date() },
    }),
  ]);

  // Registrar también en el hilo de la conversación (best-effort, no rompe el envío)
  try {
    await appendMensajeAConversacion({
      leadId: input.leadId,
      softwareId: lead.softwareId,
      direccion: 'OUT',
      cuerpo: mensajeFinal,
      usuarioId: input.usuarioId,
    });
  } catch (e) {
    logger.warn('No se pudo registrar el envío en la conversación:', (e as Error).message);
  }

  return { url, envio, mensaje: mensajeFinal, telefono, varianteId, testId };
}

export async function previewPlantilla(plantillaId: string, leadId: string) {
  const [plantilla, lead] = await Promise.all([
    prisma.whatsappPlantilla.findUnique({ where: { id: plantillaId } }),
    prisma.lead.findUnique({ where: { id: leadId } }),
  ]);
  if (!plantilla) throw new Error('Plantilla no encontrada');
  if (!lead) throw new Error('Lead no encontrado');

  const mensaje = renderPlantillaParaLead(plantilla.contenido, lead);
  const variablesFaltantes = extractVariables(mensaje); // las que no se rellenaron
  const telefono = normalizarTelefono(lead.telefono || '');
  const url = telefono
    ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
    : null;

  return { mensaje, url, variablesFaltantes, telefono, leadHasPhone: !!telefono };
}

export async function listEnvios(params: {
  leadId?: string;
  softwareId?: string;
  limit?: number;
}) {
  const where: any = {};
  if (params.leadId) where.leadId = params.leadId;
  if (params.softwareId) where.lead = { softwareId: params.softwareId };

  return prisma.whatsappEnvio.findMany({
    where,
    take: params.limit ?? 100,
    orderBy: { enviadoAt: 'desc' },
    include: {
      lead: { select: { id: true, nombre: true, empresa: true, telefono: true } },
      plantilla: { select: { id: true, nombre: true, categoria: true } },
    },
  });
}

/* ============================================================
   Plantillas seed (opcional, devuelve unas plantillas iniciales)
============================================================ */

export const PLANTILLAS_SEED: Array<Omit<CreatePlantillaInput, 'softwareId'>> = [
  {
    nombre: 'Bienvenida lead nuevo',
    categoria: 'bienvenida',
    contenido:
      'Hola {{primer_nombre}} 👋, soy del equipo y acabo de recibir tu solicitud. ¿Tienes un momento para que charlemos?',
  },
  {
    nombre: 'Follow-up sin respuesta',
    categoria: 'follow_up',
    contenido:
      'Hola {{primer_nombre}}, vi que no hemos podido conectar. ¿Sigues interesado/a en hablar sobre {{empresa}}?',
  },
  {
    nombre: 'Recordatorio de llamada',
    categoria: 'recordatorio',
    contenido:
      'Hola {{primer_nombre}}, te confirmo nuestra llamada. Si necesitas reagendar, dímelo por aquí. ¡Hasta pronto!',
  },
  {
    nombre: 'Agradecimiento tras llamada',
    categoria: 'agradecimiento',
    contenido:
      '¡Gracias por la charla, {{primer_nombre}}! Te paso por aquí los siguientes pasos en cuanto los tengamos cerrados.',
  },
];

/* ============================================================
   A/B Testing
============================================================ */

export interface CreateABTestInput {
  softwareId: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  variantes: { plantillaId: string; peso: number }[];
}

export interface UpdateABTestInput {
  nombre?: string;
  descripcion?: string;
  estado?: 'ACTIVO' | 'PAUSADO' | 'COMPLETADO';
}

export async function listABTests(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  return prisma.whatsappABTest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      variantes: {
        include: { plantilla: true },
      },
    },
  });
}

export async function getABTest(id: string) {
  return prisma.whatsappABTest.findUnique({
    where: { id },
    include: {
      variantes: {
        include: { plantilla: true },
      },
    },
  });
}

export async function createABTest(input: CreateABTestInput) {
  if (!input.softwareId?.trim()) throw new Error('softwareId obligatorio');
  if (!input.nombre?.trim()) throw new Error('nombre obligatorio');
  if (!input.variantes || input.variantes.length < 2) {
    throw new Error('Se requieren al menos 2 variantes para un test A/B');
  }

  const totalPeso = input.variantes.reduce((sum, v) => sum + v.peso, 0);
  if (totalPeso !== 100) {
    throw new Error(`La suma de pesos debe ser 100%, actual: ${totalPeso}%`);
  }

  // Verificar que las plantillas existen y pertenecen al mismo software
  const plantillaIds = input.variantes.map((v) => v.plantillaId);
  const plantillas = await prisma.whatsappPlantilla.findMany({
    where: { id: { in: plantillaIds }, softwareId: input.softwareId },
  });
  if (plantillas.length !== plantillaIds.length) {
    throw new Error('Algunas plantillas no existen o no pertenecen a este software');
  }

  return prisma.whatsappABTest.create({
    data: {
      softwareId: input.softwareId,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim(),
      categoria: input.categoria,
      estado: 'ACTIVO',
      variantes: {
        create: input.variantes.map((v) => ({
          plantillaId: v.plantillaId,
          peso: v.peso,
          envios: 0,
          respuestas: 0,
        })),
      },
    },
    include: { variantes: { include: { plantilla: true } } },
  });
}

export async function updateABTest(id: string, input: UpdateABTestInput) {
  const existing = await prisma.whatsappABTest.findUnique({ where: { id } });
  if (!existing) return null;

  const data: any = {};
  if (input.nombre !== undefined) data.nombre = input.nombre.trim();
  if (input.descripcion !== undefined) data.descripcion = input.descripcion?.trim() || null;
  if (input.estado !== undefined) data.estado = input.estado;

  return prisma.whatsappABTest.update({
    where: { id },
    data,
    include: { variantes: { include: { plantilla: true } } },
  });
}

export async function deleteABTest(id: string) {
  const existing = await prisma.whatsappABTest.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.whatsappABTest.delete({ where: { id } });
  return existing;
}

/** Selecciona una variante aleatoria según los pesos */
export function seleccionarVariante(
  variantes: { id: string; peso: number }[]
): string {
  const total = variantes.reduce((sum, v) => sum + v.peso, 0);
  if (total === 0) return variantes[0]?.id || '';

  const random = Math.random() * total;
  let acumulado = 0;
  for (const v of variantes) {
    acumulado += v.peso;
    if (random <= acumulado) return v.id;
  }
  return variantes[variantes.length - 1]?.id || '';
}

/** Busca un test A/B activo para el software y categoría, y devuelve una plantilla variante */
export async function resolverPlantillaAB(
  softwareId: string,
  categoria: string,
  plantillaIdPreferida?: string
): Promise<{ plantillaId: string; varianteId?: string; testId?: string } | null> {
  // Si se especifica plantillaId, no usar A/B
  if (plantillaIdPreferida) {
    return { plantillaId: plantillaIdPreferida };
  }

  const test = await prisma.whatsappABTest.findFirst({
    where: {
      softwareId,
      categoria,
      estado: 'ACTIVO',
    },
    include: { variantes: true },
  });

  if (!test || test.variantes.length === 0) return null;

  const varianteId = seleccionarVariante(test.variantes);
  const variante = test.variantes.find((v) => v.id === varianteId);
  if (!variante) return null;

  return {
    plantillaId: variante.plantillaId,
    varianteId: variante.id,
    testId: test.id,
  };
}

/** Incrementa el contador de envíos de una variante */
export async function incrementarEnvioVariante(varianteId: string) {
  return prisma.whatsappABTestVariante.update({
    where: { id: varianteId },
    data: { envios: { increment: 1 } },
  });
}

/** Obtiene métricas de un test A/B */
export async function getABTestMetrics(testId: string) {
  const test = await prisma.whatsappABTest.findUnique({
    where: { id: testId },
    include: { variantes: { include: { plantilla: true } } },
  });
  if (!test) return null;

  const totalEnvios = test.variantes.reduce((sum, v) => sum + v.envios, 0);

  return {
    ...test,
    metricas: test.variantes.map((v) => ({
      varianteId: v.id,
      plantillaNombre: v.plantilla.nombre,
      peso: v.peso,
      envios: v.envios,
      respuestas: v.respuestas,
      tasaRespuesta: v.envios > 0 ? ((v.respuestas / v.envios) * 100).toFixed(1) : '0.0',
      porcentajeTráfico: totalEnvios > 0 ? ((v.envios / totalEnvios) * 100).toFixed(1) : '0.0',
    })),
  };
}

/* ============================================================
   Conversaciones (hilo manual / híbrido)
   - El usuario pega manualmente lo que responde el lead (IN).
   - Los envíos automáticos via wa.me se registran como OUT.
   - MiniMax sugiere la siguiente respuesta dado el hilo completo.
============================================================ */

export type Direccion = 'IN' | 'OUT';

export async function getOrCreateConversacion(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const existing = await prisma.whatsappConversacion.findUnique({
    where: { leadId },
  });
  if (existing) return existing;

  return prisma.whatsappConversacion.create({
    data: {
      leadId,
      softwareId: lead.softwareId,
    },
  });
}

export async function getConversacionConHilo(leadId: string) {
  const conv = await getOrCreateConversacion(leadId);
  const mensajes = await prisma.whatsappMensaje.findMany({
    where: { conversacionId: conv.id },
    orderBy: { createdAt: 'asc' },
  });
  return { ...conv, mensajes };
}

export async function listConversaciones(softwareId: string) {
  return prisma.whatsappConversacion.findMany({
    where: { softwareId },
    orderBy: { ultimaActividad: 'desc' },
    include: {
      lead: { select: { id: true, nombre: true, empresa: true, telefono: true, estado: true } },
      mensajes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

export async function appendMensajeAConversacion(input: {
  leadId: string;
  softwareId?: string;
  direccion: Direccion;
  cuerpo: string;
  usuarioId?: number | null;
  iaGenerado?: boolean;
}) {
  if (!input.cuerpo?.trim()) throw new Error('El mensaje está vacío');
  if (input.direccion !== 'IN' && input.direccion !== 'OUT') {
    throw new Error('direccion debe ser IN u OUT');
  }

  const conv = await getOrCreateConversacion(input.leadId);

  const [mensaje] = await prisma.$transaction([
    prisma.whatsappMensaje.create({
      data: {
        conversacionId: conv.id,
        direccion: input.direccion,
        cuerpo: input.cuerpo,
        iaGenerado: !!input.iaGenerado,
        usuarioId: input.usuarioId ?? null,
      },
    }),
    prisma.whatsappConversacion.update({
      where: { id: conv.id },
      data: {
        ultimaActividad: new Date(),
        noLeidos: input.direccion === 'IN' ? { increment: 1 } : undefined,
      },
    }),
  ]);

  // Si es un mensaje IN, también guardarlo en el historial del lead
  if (input.direccion === 'IN') {
    await prisma.leadHistorial.create({
      data: {
        leadId: input.leadId,
        tipo: 'whatsapp_in',
        descripcion: `Respuesta WhatsApp: ${input.cuerpo.slice(0, 200)}`,
        usuarioId: input.usuarioId ?? null,
      },
    });
  }

  return mensaje;
}

export async function marcarLeida(leadId: string) {
  const conv = await prisma.whatsappConversacion.findUnique({ where: { leadId } });
  if (!conv) return null;
  return prisma.whatsappConversacion.update({
    where: { id: conv.id },
    data: { noLeidos: 0 },
  });
}

/**
 * Pide a MiniMax una sugerencia de respuesta dado el hilo completo.
 * No persiste la sugerencia — el usuario decide si la usa, la edita o la descarta.
 */
export async function sugerirRespuesta(input: {
  leadId: string;
  instrucciones?: string;
}): Promise<{ sugerencia: string; modelo: string }> {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const conv = await getOrCreateConversacion(input.leadId);
  const hilo = await prisma.whatsappMensaje.findMany({
    where: { conversacionId: conv.id },
    orderBy: { createdAt: 'asc' },
    take: 40,
  });

  const contextoLead = [
    `Lead: ${lead.nombre}`,
    lead.empresa ? `Empresa: ${lead.empresa}` : null,
    lead.cargo ? `Cargo: ${lead.cargo}` : null,
    lead.pais ? `País: ${lead.pais}` : null,
    `Estado en el CRM: ${lead.estado}`,
    lead.notas ? `Notas internas: ${lead.notas}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const system = `Eres un asistente de ventas que ayuda a redactar la siguiente respuesta de WhatsApp para un lead.
Tu objetivo: avanzar la conversación hacia una llamada o demo de forma natural, cercana y breve (máximo 3-4 líneas).
Reglas:
- Responde SOLO con el texto del mensaje a enviar, sin comillas, sin prefijos tipo "Respuesta:".
- Tono cercano pero profesional, en español de España.
- Adapta el mensaje al estado del lead y a su última respuesta.
- Si el lead no ha respondido aún, propón un follow-up suave.
- No inventes datos del lead que no estén en el contexto.
- Si pide precio o info concreta, ofrece compartirlo en una llamada corta.
- Usa emojis con mucha mesura (máximo 1, opcional).
${input.instrucciones ? `\nInstrucciones extra del usuario: ${input.instrucciones}` : ''}`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `CONTEXTO DEL LEAD:\n${contextoLead}\n\nHILO ACTUAL (más antiguo arriba, "TÚ" = mensajes salientes, "LEAD" = respuestas del lead):\n${
        hilo.length === 0
          ? '(sin mensajes previos)'
          : hilo
              .map(
                (m) =>
                  `[${m.direccion === 'OUT' ? 'TÚ' : 'LEAD'}] ${m.cuerpo}`,
              )
              .join('\n')
      }\n\nRedacta el siguiente mensaje que debería enviar TÚ.`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });
    const sugerencia = completion.choices[0]?.message?.content?.trim() || '';
    if (!sugerencia) throw new Error('La IA devolvió una sugerencia vacía');
    return { sugerencia, modelo: env.OPENAI_MODEL };
  } catch (e: any) {
    logger.error('sugerirRespuesta error:', e?.message || e);
    throw new Error(`Error pidiendo sugerencia a la IA: ${e?.message || 'desconocido'}`);
  }
}

/* ============================================================
   Helper genérico para una llamada IA con prompt directo
============================================================ */
async function llamadaIA(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 600,
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
  });
  const text = completion.choices[0]?.message?.content?.trim() || '';
  if (!text) throw new Error('La IA devolvió respuesta vacía');
  return text;
}

function leadContexto(lead: any): string {
  return [
    `Nombre: ${lead.nombre}`,
    lead.empresa ? `Empresa: ${lead.empresa}` : null,
    lead.cargo ? `Cargo: ${lead.cargo}` : null,
    lead.pais ? `País: ${lead.pais}` : null,
    `Estado CRM: ${lead.estado}`,
    lead.origen ? `Origen: ${lead.origen}` : null,
    lead.notas ? `Notas: ${lead.notas}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

/* ============================================================
   1) CEMENTERIO — leads inactivos y resurrección con IA
============================================================ */

export async function getLeadsInactivos(softwareId: string, diasMin: number = 30) {
  const cutoff = new Date(Date.now() - diasMin * 24 * 3600 * 1000);
  const leads = await prisma.lead.findMany({
    where: {
      softwareId,
      estado: { in: ['NO_RESPONDE', 'RECHAZADO'] as any },
      OR: [{ ultimoContacto: { lte: cutoff } }, { ultimoContacto: null }],
    },
    orderBy: { ultimoContacto: 'asc' },
    take: 200,
  });

  return leads.map((l) => ({
    ...l,
    diasInactivo: l.ultimoContacto
      ? Math.floor((Date.now() - new Date(l.ultimoContacto).getTime()) / (24 * 3600 * 1000))
      : null,
  }));
}

export async function generarMensajeResurreccion(leadId: string, pretextoOpcional?: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const system = `Eres un experto en reactivación de leads dormidos. Generas mensajes de WhatsApp cortos (3-4 líneas máx) que reabren la conversación de forma natural, sin sonar a venta agresiva.
Reglas:
- Usa un PRETEXTO creativo y específico para el lead (lanzamiento, novedad del sector, noticia, "te pensé porque...", aprendizaje reciente).
- Tono cercano y honesto, NO empalagoso.
- Termina con una pregunta abierta corta o invitación suave a charlar (sin presionar).
- Español de España. Sin emojis (o máximo 1).
- Responde SOLO con el texto del mensaje, sin comillas ni prefijos.`;
  const user = `LEAD A REACTIVAR:
${leadContexto(lead)}

Días sin contacto: ${
    lead.ultimoContacto
      ? Math.floor((Date.now() - new Date(lead.ultimoContacto).getTime()) / (24 * 3600 * 1000))
      : 'nunca contactado'
  }

${pretextoOpcional ? `PRETEXTO/ÁNGULO SUGERIDO POR EL USUARIO: ${pretextoOpcional}` : 'Inventa un pretexto creativo y verosímil.'}

Genera el mensaje de reactivación.`;

  const texto = await llamadaIA({ system, user, temperature: 0.85, maxTokens: 300 });
  return { mensaje: texto, leadId, modelo: env.OPENAI_MODEL };
}

/* ============================================================
   2) ARENA — battle de plantillas vs perfiles sintéticos
============================================================ */

export interface PerfilSintetico {
  nombre: string;
  descripcion: string;
}

export async function generarPerfilesSinteticos(input: {
  softwareId: string;
  cantidad: number;
}): Promise<{ perfiles: PerfilSintetico[]; modelo: string }> {
  const cantidad = Math.min(Math.max(input.cantidad || 5, 1), 20);

  // Datos del software (CrmClient) — descripción real del producto
  const crm = await prisma.crmClient.findFirst({ where: { saas: input.softwareId } });

  // Sample de leads reales del software (anonimizado) para inspirar el perfilado
  const sampleLeads = await prisma.lead.findMany({
    where: { softwareId: input.softwareId },
    select: { empresa: true, cargo: true, pais: true, estado: true, notas: true },
    take: 30,
    orderBy: { createdAt: 'desc' },
  });

  // Distribución de cargos/sectores reales
  const cargos = Array.from(new Set(sampleLeads.map((l) => l.cargo).filter(Boolean))).slice(0, 10);
  const paises = Array.from(new Set(sampleLeads.map((l) => l.pais).filter(Boolean))).slice(0, 6);

  const system = `Generas perfiles SINTÉTICOS de leads para testear plantillas de WhatsApp en un battle A/B.
Reglas:
- Genera EXACTAMENTE ${cantidad} perfiles DIVERSOS (no parecidos entre sí).
- Cada perfil debe tener: nombre corto descriptivo (3-5 palabras) y descripción rica (1-2 frases con sector, cargo, contexto, lo que valora, su estado mental al recibir WhatsApp comercial).
- Cubre el espectro real: muy interesado, escéptico, ocupado, técnico, decisor, gatekeeper, recién rechazado, lead-frío que vuelve, lead que ya conoce el producto, etc.
- Adapta los perfiles al SECTOR/CONTEXTO del producto y a la base de clientes que te paso.
- Devuelve EXCLUSIVAMENTE JSON válido con la forma:
{
  "perfiles": [
    { "nombre": "<corto>", "descripcion": "<detalle>" }
  ]
}`;

  const user = `PRODUCTO / SAAS:
- ID: ${input.softwareId}
- Nombre: ${crm?.name || input.softwareId}
- Descripción: ${crm?.descripcion || '(sin descripción registrada — infiere del nombre y la base de leads)'}

BASE DE LEADS REALES DEL PRODUCTO (sample anonimizado):
- Cargos frecuentes: ${cargos.length ? cargos.join(', ') : 'desconocidos'}
- Países: ${paises.length ? paises.join(', ') : 'desconocidos'}
- Total leads sample: ${sampleLeads.length}
- Empresas ejemplo: ${sampleLeads
    .map((l) => l.empresa)
    .filter(Boolean)
    .slice(0, 8)
    .join(', ') || 'desconocidas'}

Genera ${cantidad} perfiles representativos para testear plantillas A/B de WhatsApp con esta audiencia.`;

  const raw = await llamadaIA({ system, user, temperature: 0.9, maxTokens: 2000, json: true });
  try {
    const json = JSON.parse(raw);
    if (!Array.isArray(json.perfiles)) throw new Error('formato inválido');
    return {
      perfiles: json.perfiles.slice(0, cantidad).map((p: any) => ({
        nombre: String(p.nombre || 'Perfil sin nombre').slice(0, 80),
        descripcion: String(p.descripcion || '').slice(0, 400),
      })),
      modelo: env.OPENAI_MODEL,
    };
  } catch {
    throw new Error('La IA devolvió un JSON inválido');
  }
}

export async function batallaPlantillas(input: {
  plantillaAId: string;
  plantillaBId: string;
  perfiles: PerfilSintetico[];
  usuarioId?: number;
  guardar?: boolean; // por defecto true
}) {
  const [plantillaA, plantillaB] = await Promise.all([
    prisma.whatsappPlantilla.findUnique({ where: { id: input.plantillaAId } }),
    prisma.whatsappPlantilla.findUnique({ where: { id: input.plantillaBId } }),
  ]);
  if (!plantillaA || !plantillaB) throw new Error('Alguna plantilla no existe');
  if (plantillaA.softwareId !== plantillaB.softwareId) {
    throw new Error('Las plantillas deben pertenecer al mismo workspace');
  }
  if (!input.perfiles?.length) throw new Error('Define al menos 1 perfil de lead');

  const system = `Eres un evaluador experto en mensajería comercial por WhatsApp. Te presento dos plantillas (A y B) y una lista de PERFILES de leads. Para CADA perfil, evalúa qué plantilla es más probable que genere respuesta y por qué.

Devuelve EXCLUSIVAMENTE JSON válido con esta forma:
{
  "resultados": [
    {
      "perfil": "<nombre del perfil>",
      "ganadora": "A" | "B" | "EMPATE",
      "puntuacionA": 0-100,
      "puntuacionB": 0-100,
      "razon": "<una frase corta de por qué>"
    }
  ],
  "ganadorGlobal": "A" | "B" | "EMPATE",
  "resumen": "<una frase con la lectura general>"
}`;
  const user = `PLANTILLA A ("${plantillaA.nombre}"):
${plantillaA.contenido}

PLANTILLA B ("${plantillaB.nombre}"):
${plantillaB.contenido}

PERFILES DE LEADS:
${input.perfiles.map((p, i) => `${i + 1}. ${p.nombre}: ${p.descripcion}`).join('\n')}

Evalúa.`;

  const raw = await llamadaIA({ system, user, temperature: 0.4, maxTokens: 1200, json: true });
  let resultado: any;
  try {
    resultado = JSON.parse(raw);
  } catch {
    throw new Error('La IA devolvió un JSON inválido');
  }

  // Persistir (a menos que se desactive)
  if (input.guardar !== false) {
    try {
      const battle = await prisma.whatsappArenaBattle.create({
        data: {
          softwareId: plantillaA.softwareId,
          plantillaAId: plantillaA.id,
          plantillaBId: plantillaB.id,
          perfiles: input.perfiles as any,
          resultado: resultado as any,
          ganadorGlobal: resultado.ganadorGlobal || 'EMPATE',
          usuarioId: input.usuarioId ?? null,
        },
      });
      return { ...resultado, battleId: battle.id, guardada: true };
    } catch (e) {
      logger.warn('No se pudo guardar la batalla:', (e as Error).message);
      return { ...resultado, guardada: false };
    }
  }
  return { ...resultado, guardada: false };
}

export async function listArenaBattles(softwareId: string) {
  return prisma.whatsappArenaBattle.findMany({
    where: { softwareId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      plantillaA: { select: { id: true, nombre: true, contenido: true, categoria: true } },
      plantillaB: { select: { id: true, nombre: true, contenido: true, categoria: true } },
    },
  });
}

export async function getArenaBattle(id: string) {
  return prisma.whatsappArenaBattle.findUnique({
    where: { id },
    include: {
      plantillaA: { select: { id: true, nombre: true, contenido: true, categoria: true } },
      plantillaB: { select: { id: true, nombre: true, contenido: true, categoria: true } },
    },
  });
}

export async function deleteArenaBattle(id: string) {
  const existing = await prisma.whatsappArenaBattle.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.whatsappArenaBattle.delete({ where: { id } });
  return existing;
}

export async function updateArenaBattle(id: string, data: { nota?: string }) {
  return prisma.whatsappArenaBattle.update({
    where: { id },
    data: { nota: data.nota ?? null },
  });
}

/* ============================================================
   3) SPARRING — ensayar conversación con lead sintético
============================================================ */

export async function sparringResponder(input: {
  leadId: string;
  hilo: { role: 'tu' | 'lead'; texto: string }[];
}) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const system = `Vas a interpretar el ROL de un lead llamado "${lead.nombre}" (${lead.empresa || 'sin empresa'}, ${lead.cargo || 'sin cargo'}, ${lead.pais || 'país desconocido'}, estado CRM: ${lead.estado}).
Eres un PROSPECTO REAL. Responde como respondería esta persona en WhatsApp:
- Mensajes cortos, naturales, a veces con erratas leves o sin tildes (como en WhatsApp real).
- Coherente con tu rol/sector. Si eres CEO, no preguntas tonterías técnicas; si eres técnico, sí.
- A veces interesado, a veces ocupado, a veces escéptico — sé realista, no tienes que poner las cosas fáciles.
- Si el agente comercial es bueno, accedes a llamada/demo; si no, vas dando largas.
- Responde SOLO como el lead, sin comillas, sin notas de director, sin prefijos.`;
  const user = `HILO HASTA AHORA (más antiguo arriba):
${input.hilo
  .map((m) => `[${m.role === 'tu' ? 'AGENTE' : 'TÚ (LEAD)'}] ${m.texto}`)
  .join('\n')}

Te toca responder como el lead.`;

  const texto = await llamadaIA({ system, user, temperature: 0.85, maxTokens: 300 });
  return { mensaje: texto, leadId: lead.id, modelo: env.OPENAI_MODEL };
}

/* ============================================================
   4) WHISPER — coach proactivo en el composer
============================================================ */

export async function whisperConsejos(input: { leadId: string; borrador: string }) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new Error('Lead no encontrado');

  const conv = await prisma.whatsappConversacion.findUnique({ where: { leadId: input.leadId } });
  const hilo = conv
    ? await prisma.whatsappMensaje.findMany({
        where: { conversacionId: conv.id },
        orderBy: { createdAt: 'asc' },
        take: 30,
      })
    : [];

  const system = `Eres un copiloto de ventas. Te paso el hilo de WhatsApp con un lead y el BORRADOR que el comercial está escribiendo ahora mismo.
Tu job: detectar oportunidades, riesgos y mejoras concretas DEL BORRADOR a la luz del hilo. Devuelve JSON estricto.

Formato:
{
  "tips": [
    { "tipo": "warning"|"opportunity"|"improvement"|"insight", "titulo": "<3-5 palabras>", "detalle": "<1 frase concreta y accionable>" }
  ],
  "puntuacionBorrador": 0-100,
  "resumen": "<una frase>"
}

Devuelve entre 1 y 4 tips. Si el borrador está vacío, los tips se basan en el hilo (qué decir a continuación).`;
  const hiloTxt =
    hilo.length === 0
      ? '(sin mensajes previos)'
      : hilo.map((m) => `[${m.direccion === 'OUT' ? 'AGENTE' : 'LEAD'}] ${m.cuerpo}`).join('\n');
  const user = `LEAD:
${leadContexto(lead)}

HILO:
${hiloTxt}

BORRADOR DEL AGENTE (puede estar vacío):
${input.borrador || '(vacío)'}

Analiza y devuelve el JSON.`;

  const raw = await llamadaIA({ system, user, temperature: 0.5, maxTokens: 700, json: true });
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('La IA devolvió un JSON inválido');
  }
}

/* ============================================================
   5) STORYBOARD — journey completo del lead
============================================================ */

export async function getLeadStoryboard(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      etiquetas: true,
      gestor: { select: { id: true, nombre: true, email: true } },
    },
  });
  if (!lead) throw new Error('Lead no encontrado');

  const [historial, envios, conversacion, llamadas, emails, trackedEvents] = await Promise.all([
    prisma.leadHistorial.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
    prisma.whatsappEnvio.findMany({
      where: { leadId },
      orderBy: { enviadoAt: 'asc' },
      take: 200,
    }),
    prisma.whatsappConversacion.findUnique({
      where: { leadId },
      include: { mensajes: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.llamadaReal.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
    prisma.emailEnvio.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { eventos: { orderBy: { fecha: 'asc' } } },
    }),
    lead.email
      ? prisma.trackedEvent.findMany({
          where: { email: lead.email },
          orderBy: { timestamp: 'asc' },
          take: 300,
        })
      : Promise.resolve([]),
  ]);

  type Evento = {
    fecha: string;
    tipo:
      | 'creacion'
      | 'historial'
      | 'whatsapp_out'
      | 'whatsapp_in'
      | 'llamada'
      | 'cambio_estado'
      | 'email_enviado'
      | 'email_abierto'
      | 'email_click'
      | 'email_rebotado'
      | 'web_visita'
      | 'web_evento';
    titulo: string;
    detalle?: string;
    meta?: any;
  };

  const eventos: Evento[] = [];

  eventos.push({
    fecha: lead.createdAt.toISOString(),
    tipo: 'creacion',
    titulo: `Lead creado vía ${lead.origen}`,
    detalle: `Estado inicial: NUEVO`,
  });

  // Historial — detectar cambios de estado por descripción
  for (const h of historial) {
    const esCambioEstado = /estado|status/i.test(h.tipo || '') || /cambi[oó]/i.test(h.descripcion);
    eventos.push({
      fecha: h.createdAt.toISOString(),
      tipo: esCambioEstado
        ? 'cambio_estado'
        : h.tipo?.startsWith('whatsapp_in')
          ? 'whatsapp_in'
          : 'historial',
      titulo: h.tipo || 'evento',
      detalle: h.descripcion,
    });
  }

  for (const e of envios) {
    eventos.push({
      fecha: e.enviadoAt.toISOString(),
      tipo: 'whatsapp_out',
      titulo: 'WhatsApp enviado',
      detalle: e.mensaje,
    });
  }

  if (conversacion) {
    for (const m of conversacion.mensajes) {
      eventos.push({
        fecha: m.createdAt.toISOString(),
        tipo: m.direccion === 'OUT' ? 'whatsapp_out' : 'whatsapp_in',
        titulo: m.direccion === 'OUT' ? 'Tú enviaste' : 'Lead respondió',
        detalle: m.cuerpo,
        meta: { iaGenerado: m.iaGenerado },
      });
    }
  }

  for (const l of llamadas) {
    eventos.push({
      fecha: (l.iniciadaAt || l.createdAt).toISOString(),
      tipo: 'llamada',
      titulo: `Llamada ${l.direccion} (${l.estado})`,
      detalle: l.notasPost || (l.duracionSeg ? `Duración: ${l.duracionSeg}s` : undefined),
      meta: { calificacion: l.calificacion, duracionSeg: l.duracionSeg },
    });
    if (l.leadEstadoPrev && l.leadEstadoPost && l.leadEstadoPrev !== l.leadEstadoPost) {
      eventos.push({
        fecha: (l.terminadaAt || l.iniciadaAt || l.createdAt).toISOString(),
        tipo: 'cambio_estado',
        titulo: `${l.leadEstadoPrev} → ${l.leadEstadoPost}`,
        detalle: `Tras llamada (${l.estado})`,
      });
    }
  }

  // Emails: envío + apertura + clicks + rebote
  for (const em of emails) {
    eventos.push({
      fecha: (em.enviadoEn || em.createdAt).toISOString(),
      tipo: em.estado === 'rebotado' ? 'email_rebotado' : 'email_enviado',
      titulo: em.asunto || 'Email enviado',
      detalle: em.destinatario,
      meta: { estado: em.estado, envioId: em.id },
    });
    for (const ev of em.eventos) {
      const tipoEv =
        ev.tipo === 'opened'
          ? 'email_abierto'
          : ev.tipo === 'clicked'
            ? 'email_click'
            : ev.tipo === 'bounced'
              ? 'email_rebotado'
              : null;
      if (!tipoEv) continue;
      eventos.push({
        fecha: ev.fecha.toISOString(),
        tipo: tipoEv,
        titulo:
          tipoEv === 'email_abierto'
            ? `Abrió: ${em.asunto || 'email'}`
            : tipoEv === 'email_click'
              ? `Click en: ${em.asunto || 'email'}`
              : `Rebotado: ${em.asunto || 'email'}`,
        detalle: tipoEv === 'email_click' ? (ev.datos as any)?.url : undefined,
      });
    }
  }

  // Tracking de webs (TrackedEvent matched by email)
  for (const t of trackedEvents) {
    const d: any = t.datos || {};
    const url = d.url || d.page || d.path || d.href;
    const esPageView = /page_?view|pageview|visit|view|landing/i.test(t.eventName);
    eventos.push({
      fecha: t.timestamp.toISOString(),
      tipo: esPageView ? 'web_visita' : 'web_evento',
      titulo: esPageView ? 'Visita web' : t.eventName,
      detalle: url || (typeof d === 'object' ? JSON.stringify(d).slice(0, 120) : undefined),
      meta: { eventName: t.eventName, url },
    });
  }

  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Mapa de actividad por día (heatmap GitHub-style) — últimos 90 días
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - 89);
  const heatmap: { fecha: string; count: number }[] = [];
  const conteo: Record<string, number> = {};
  for (const ev of eventos) {
    const d = ev.fecha.slice(0, 10);
    if (d >= inicio.toISOString().slice(0, 10)) conteo[d] = (conteo[d] || 0) + 1;
  }
  for (let i = 0; i < 90; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({ fecha: key, count: conteo[key] || 0 });
  }

  const kpis = {
    totalEventos: eventos.length,
    mensajesEnviados: eventos.filter((e) => e.tipo === 'whatsapp_out').length,
    mensajesRecibidos: eventos.filter((e) => e.tipo === 'whatsapp_in').length,
    llamadasTotal: llamadas.length,
    emailsEnviados: emails.length,
    emailsAbiertos: eventos.filter((e) => e.tipo === 'email_abierto').length,
    webVisitas: eventos.filter((e) => e.tipo === 'web_visita').length,
    diasEnPipeline: Math.floor((Date.now() - lead.createdAt.getTime()) / (24 * 3600 * 1000)),
    ultimaActividad: eventos[eventos.length - 1]?.fecha || null,
  };

  return { lead, kpis, eventos, heatmap };
}

/* ============================================================
   6) HIPERPERSONALIZACIÓN MASA — N mensajes únicos
============================================================ */

export async function generarMensajesPersonalizados(input: {
  leadIds: string[];
  objetivo: string;
  toneRef?: string; // opcional: plantilla base como referencia de tono
}) {
  if (!input.leadIds?.length) throw new Error('No hay leads');
  if (input.leadIds.length > 50) throw new Error('Máximo 50 leads por lote (evita rate-limit)');
  if (!input.objetivo?.trim()) throw new Error('Indica el objetivo de la campaña');

  const leads = await prisma.lead.findMany({ where: { id: { in: input.leadIds } } });

  const system = `Generas mensajes de WhatsApp ÚNICOS para cada lead, hiperpersonalizados a su perfil. Reglas:
- 3-4 líneas máx por mensaje.
- Tono cercano y profesional, español de España.
- NUNCA repitas literalmente la misma frase entre leads — cada mensaje debe sonar pensado para esa persona.
- Si tienes referencia de tono, respétala pero adapta el contenido.
- Sin emojis (o máximo 1).
- Devuelve JSON estricto.

Formato:
{
  "mensajes": [
    { "leadId": "<id>", "texto": "<mensaje único>" }
  ]
}`;
  const user = `OBJETIVO DE LA CAMPAÑA: ${input.objetivo}
${input.toneRef ? `\nREFERENCIA DE TONO:\n${input.toneRef}` : ''}

LEADS:
${leads
  .map(
    (l) =>
      `- id=${l.id} | ${l.nombre}${l.empresa ? ` · ${l.empresa}` : ''}${l.cargo ? ` · ${l.cargo}` : ''}${l.pais ? ` · ${l.pais}` : ''} · estado=${l.estado}${l.notas ? ` | notas: ${l.notas.slice(0, 120)}` : ''}`,
  )
  .join('\n')}

Genera un mensaje único por lead.`;

  const raw = await llamadaIA({ system, user, temperature: 0.85, maxTokens: 3000, json: true });
  try {
    const json = JSON.parse(raw);
    return json;
  } catch {
    throw new Error('La IA devolvió un JSON inválido');
  }
}

/* ============================================================
   7) SMART SNIPPETS — resolver /comandos en el composer
============================================================ */

export const SNIPPETS_DISPONIBLES = [
  { comando: 'precio', descripcion: 'Inserta info de precio (genérico)' },
  { comando: 'calendario', descripcion: 'Inserta link para agendar llamada' },
  { comando: 'caso', descripcion: 'Caso de éxito relevante para este lead (IA)' },
  { comando: 'demo', descripcion: 'Invitación a demo personalizada' },
  { comando: 'formal', descripcion: 'Reescribe el borrador en tono formal (IA)' },
  { comando: 'informal', descripcion: 'Reescribe el borrador en tono informal (IA)' },
  { comando: 'corto', descripcion: 'Acorta el borrador a 1-2 líneas (IA)' },
  { comando: 'tu-empresa', descripcion: 'Inserta el nombre de la empresa del lead' },
];

export async function resolverSnippet(input: {
  comando: string;
  leadId?: string;
  borrador?: string;
}): Promise<{ texto: string; reemplazaBorrador: boolean }> {
  const cmd = input.comando.replace(/^\//, '').toLowerCase().trim();
  const lead = input.leadId
    ? await prisma.lead.findUnique({ where: { id: input.leadId } })
    : null;

  switch (cmd) {
    case 'precio':
      return {
        texto: 'Te paso la info de precios: tenemos planes desde {{precio_base}}/mes con descuento anual. ¿Quieres que te la mande detallada o lo vemos en una llamada de 15 min?',
        reemplazaBorrador: false,
      };
    case 'calendario':
      return {
        texto: 'Agenda en el hueco que te venga mejor: {{link_calendario}}',
        reemplazaBorrador: false,
      };
    case 'demo':
      return {
        texto: `Hola${lead ? ` ${lead.nombre.split(/\s+/)[0]}` : ''}, ¿te organizo una demo personalizada de 20 minutos esta semana? Te enseño cómo lo usaríais en ${lead?.empresa || 'tu equipo'}.`,
        reemplazaBorrador: false,
      };
    case 'tu-empresa':
      return { texto: lead?.empresa || '[empresa]', reemplazaBorrador: false };

    case 'caso': {
      if (!lead) throw new Error('Para /caso necesito un lead seleccionado');
      const system = `Generas, en 2 frases máximas, una referencia a un caso de éxito plausible del SECTOR del lead que dado el contexto refuerce credibilidad. Inventa empresa y cifra realista. Tono natural de WhatsApp. SOLO el texto.`;
      const user = `LEAD: ${leadContexto(lead)}\nDevuelve la frase.`;
      const texto = await llamadaIA({ system, user, temperature: 0.8, maxTokens: 200 });
      return { texto, reemplazaBorrador: false };
    }
    case 'formal':
    case 'informal':
    case 'corto': {
      if (!input.borrador?.trim()) {
        throw new Error(`Para /${cmd} primero escribe algo en el borrador`);
      }
      const instruccion =
        cmd === 'formal'
          ? 'Reescribe el siguiente borrador de WhatsApp en tono más formal, manteniendo el contenido. SOLO el texto.'
          : cmd === 'informal'
            ? 'Reescribe el siguiente borrador de WhatsApp en tono más cercano e informal, manteniendo el contenido. SOLO el texto.'
            : 'Acorta el siguiente borrador a máximo 2 líneas conservando lo esencial. SOLO el texto.';
      const texto = await llamadaIA({
        system: instruccion,
        user: input.borrador,
        temperature: 0.6,
        maxTokens: 400,
      });
      return { texto, reemplazaBorrador: true };
    }
    default:
      throw new Error(`Snippet "/${cmd}" no reconocido`);
  }
}


