import OpenAI from 'openai';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// ============================================================
// CASO DE ÉXITO AUTOMÁTICO — "Prueba social en piloto automático"
// ------------------------------------------------------------
// Detecta hitos reales (lead convertido, N conversiones acumuladas)
// y genera el case study con IA usando SOLO datos reales del CRM.
// Queda como ContentPiece (CASE_STUDY, DRAFT) listo para publicar
// con el pipeline existente (seoPublisher / repurpose a redes).
// ============================================================

// Cliente propio: respeta el proveedor configurado (OPENAI_BASE_URL / MiniMax)
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

/** Umbrales de hitos agregados de conversión */
const HITOS_AGREGADOS = [10, 25, 50, 100, 250, 500];

// ------------------------------------------------------------
// Detección de hitos
// ------------------------------------------------------------

export interface MilestoneLead {
  tipo: 'lead_convertido';
  leadId: string;
  nombre: string;
  empresa: string | null;
  convertidoHaceDias: number;
}

export interface MilestoneAggregate {
  tipo: 'hito_conversiones';
  total: number;
  umbral: number;
}

export async function detectMilestones(softwareId: string): Promise<{
  leadsPendientes: MilestoneLead[];
  hitosAgregados: MilestoneAggregate[];
  totalConvertidos: number;
}> {
  const convertidos = await prisma.lead.findMany({
    where: { softwareId, estado: 'CONVERTIDO' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, nombre: true, empresa: true, metadata: true, updatedAt: true },
  });

  // a) Leads convertidos que aún no tienen case study
  const leadsPendientes: MilestoneLead[] = convertidos
    .filter((l) => !(l.metadata as any)?.caseStudy)
    .slice(0, 20)
    .map((l) => ({
      tipo: 'lead_convertido' as const,
      leadId: l.id,
      nombre: l.nombre,
      empresa: l.empresa,
      convertidoHaceDias: Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / (24 * 3600 * 1000)),
    }));

  // b) Hitos agregados cruzados sin historia generada (marcadas con keyword hito-N)
  const total = convertidos.length;
  const umbralesCruzados = HITOS_AGREGADOS.filter((u) => total >= u);
  const hitosAgregados: MilestoneAggregate[] = [];
  for (const umbral of umbralesCruzados) {
    const existe = await prisma.contentPiece.findFirst({
      where: { softwareId, type: 'CASE_STUDY', keywords: { has: `hito-${umbral}` } },
      select: { id: true },
    });
    if (!existe) hitosAgregados.push({ tipo: 'hito_conversiones', total, umbral });
  }

  return { leadsPendientes, hitosAgregados, totalConvertidos: total };
}

// ------------------------------------------------------------
// Generación desde datos reales
// ------------------------------------------------------------

async function callIA(system: string, user: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.6,
    max_tokens: 1800,
  });
  const content = response.choices[0].message.content;
  if (!content?.trim()) throw new Error('La IA no devolvió contenido');
  return content.trim();
}

/**
 * Genera un case study para un lead CONVERTIDO usando sus datos reales.
 * No inventa métricas: donde falten datos deja [DATO A CONFIRMAR].
 */
export async function generateCaseStudyForLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { historial: { orderBy: { createdAt: 'asc' } } },
  });
  if (!lead) throw new Error('Lead no encontrado');
  if (lead.estado !== 'CONVERTIDO') throw new Error('El lead no está convertido — el caso de éxito se genera de hitos reales');
  if ((lead.metadata as any)?.caseStudy) throw new Error('Este lead ya tiene un caso de éxito generado');

  const software = await prisma.software.findUnique({
    where: { id: lead.softwareId },
    select: { nombre: true, nicho: true, problemaPrincipal: true, promesaValor: true },
  });

  const diasHastaConversion = Math.floor(
    (new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime()) / (24 * 3600 * 1000)
  );
  const interacciones = lead.historial.length;
  const canales = Array.from(new Set(lead.historial.map((h) => h.tipo))).join(', ');

  const system = `Eres un redactor de casos de éxito para ${software?.nicho || 'negocios locales'}. Escribes en español de España, tono cercano y creíble.

REGLAS INNEGOCIABLES:
- Usa SOLO los datos reales que te paso. NO inventes métricas, porcentajes ni cifras de dinero.
- Donde un caso de éxito normalmente llevaría un dato que NO tienes (resultado numérico, testimonio textual), escribe el marcador [DATO A CONFIRMAR: descripción de qué falta].
- Devuelve SOLO el case study en Markdown, empezando por un H1.`;

  const user = `Escribe el caso de éxito de este cliente REAL de ${software?.nombre || 'nuestro producto'}:

DATOS REALES:
- Cliente: ${lead.empresa || lead.nombre}
- Sector: ${software?.nicho || 'negocio local'}
- Problema típico del sector: ${software?.problemaPrincipal || '[DATO A CONFIRMAR: problema del cliente]'}
- Lo que promete el producto: ${software?.promesaValor || 'mejorar la gestión'}
- Cómo nos conoció (canal de origen): ${lead.origen}
- Días desde el primer contacto hasta convertirse en cliente: ${diasHastaConversion}
- Nº de interacciones durante el proceso: ${interacciones}${canales ? ` (canales: ${canales})` : ''}
${lead.pais ? `- País: ${lead.pais}` : ''}
${lead.notas ? `- Notas internas (úsalas con criterio, sin exponer nada sensible): ${lead.notas.slice(0, 500)}` : ''}

ESTRUCTURA:
- H1: título atractivo con el nombre del cliente
- "El punto de partida" (el problema)
- "El proceso" (cómo fue de ${lead.origen} a cliente en ${diasHastaConversion} días)
- "El resultado" (aquí irán los marcadores [DATO A CONFIRMAR] que hagan falta)
- Cita/testimonio: déjalo como [DATO A CONFIRMAR: pedir testimonio al cliente]
- Cierre con CTA suave`;

  const body = await callIA(system, user);

  const titleMatch = body.match(/^#\s*(.+?)(?:\n|$)/m);
  const title = titleMatch?.[1]?.trim() || `Caso de éxito: ${lead.empresa || lead.nombre}`;
  const excerpt = body.replace(/[#*_`\[\]]/g, '').replace(/\s+/g, ' ').slice(0, 200) + '...';

  const aviso = `> ⚠️ Borrador generado automáticamente desde el hito real de conversión. Revisa los marcadores [DATO A CONFIRMAR] y valida con el cliente antes de publicar.\n\n`;

  const piece = await prisma.contentPiece.create({
    data: {
      softwareId: lead.softwareId,
      type: 'CASE_STUDY',
      status: 'DRAFT',
      title,
      body: aviso + body,
      excerpt,
      keywords: ['caso de éxito', software?.nicho || '', lead.empresa || lead.nombre].filter(Boolean),
      aiPrompt: `caso-exito-real:lead=${lead.id}`,
      aiModel: env.OPENAI_MODEL,
    },
  });

  // Marcar el lead para no regenerar
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      metadata: {
        ...(typeof lead.metadata === 'object' && lead.metadata !== null ? lead.metadata : {}),
        caseStudy: { contentId: piece.id, generatedAt: new Date().toISOString() },
      },
    },
  });

  logger.info(`[CaseStudy] Caso de éxito generado para ${lead.empresa || lead.nombre} (${piece.id})`);
  return piece;
}

/**
 * Genera la historia de un hito agregado ("¡Ya son 50 negocios!").
 */
export async function generateMilestoneStory(softwareId: string, umbral: number) {
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
    select: { nombre: true, nicho: true, promesaValor: true },
  });
  if (!software) throw new Error('Software no encontrado');

  const total = await prisma.lead.count({ where: { softwareId, estado: 'CONVERTIDO' } });
  if (total < umbral) throw new Error(`Aún no se ha alcanzado el hito de ${umbral} (van ${total})`);

  // Datos agregados reales para que la historia tenga sustancia
  const convertidos = await prisma.lead.findMany({
    where: { softwareId, estado: 'CONVERTIDO' },
    select: { origen: true, createdAt: true, updatedAt: true },
  });
  const porOrigen: Record<string, number> = {};
  let sumaDias = 0;
  for (const l of convertidos) {
    porOrigen[l.origen] = (porOrigen[l.origen] || 0) + 1;
    sumaDias += (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) / (24 * 3600 * 1000);
  }
  const mediaDias = Math.round(sumaDias / convertidos.length);
  const topOrigenes = Object.entries(porOrigen).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const system = `Eres un redactor de contenido para ${software.nicho || 'negocios locales'}. Español de España, tono celebratorio pero sobrio, sin humo.
REGLAS: usa SOLO los datos reales que te paso. No inventes cifras. Devuelve SOLO Markdown empezando por H1.`;

  const user = `Escribe una historia corta (400-600 palabras) celebrando un hito REAL de ${software.nombre}:

DATOS REALES:
- Hito alcanzado: ${umbral} clientes convertidos (total actual: ${total})
- Tiempo medio desde primer contacto a cliente: ${mediaDias} días
- De dónde vienen: ${topOrigenes.map(([o, n]) => `${o} (${n})`).join(', ')}
- Lo que promete el producto: ${software.promesaValor || 'mejorar la gestión'}

ESTRUCTURA: H1 celebratorio · qué significa este número · un vistazo a los datos (tiempos, canales) · agradecimiento · CTA suave para quien aún lo está pensando.`;

  const body = await callIA(system, user);
  const titleMatch = body.match(/^#\s*(.+?)(?:\n|$)/m);
  const title = titleMatch?.[1]?.trim() || `${umbral} clientes confían en ${software.nombre}`;

  const piece = await prisma.contentPiece.create({
    data: {
      softwareId,
      type: 'CASE_STUDY',
      status: 'DRAFT',
      title,
      body,
      excerpt: body.replace(/[#*_`]/g, '').replace(/\s+/g, ' ').slice(0, 200) + '...',
      keywords: [`hito-${umbral}`, 'hito', software.nicho || ''].filter(Boolean),
      aiPrompt: `hito-conversiones:${umbral}`,
      aiModel: env.OPENAI_MODEL,
    },
  });

  logger.info(`[CaseStudy] Historia del hito ${umbral} generada para ${software.nombre}`);
  return piece;
}

// ------------------------------------------------------------
// Cron: generación automática de borradores
// ------------------------------------------------------------

/** Genera borradores pendientes para todos los software activos (cap por run para no quemar tokens). */
export async function autoGenerateCaseStudies(maxPorSoftware = 3): Promise<{ generated: number; errors: number }> {
  const softwares = await prisma.software.findMany({ where: { activo: true }, select: { id: true, nombre: true } });

  let generated = 0;
  let errors = 0;

  for (const sw of softwares) {
    try {
      const { leadsPendientes, hitosAgregados } = await detectMilestones(sw.id);

      for (const hito of hitosAgregados.slice(0, 1)) {
        try {
          await generateMilestoneStory(sw.id, hito.umbral);
          generated++;
        } catch (err) {
          errors++;
          logger.warn(`[CaseStudy] Error generando hito ${hito.umbral} de ${sw.nombre}: ${(err as Error).message}`);
        }
      }

      for (const lead of leadsPendientes.slice(0, maxPorSoftware)) {
        try {
          await generateCaseStudyForLead(lead.leadId);
          generated++;
        } catch (err) {
          errors++;
          logger.warn(`[CaseStudy] Error generando caso de ${lead.nombre}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errors++;
      logger.error(`[CaseStudy] Error detectando hitos de ${sw.nombre}:`, err);
    }
  }

  return { generated, errors };
}

// ------------------------------------------------------------
// Lectura
// ------------------------------------------------------------

export async function listCaseStudies(softwareId: string) {
  const [pieces, milestones] = await Promise.all([
    prisma.contentPiece.findMany({
      where: { softwareId, type: 'CASE_STUDY' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    detectMilestones(softwareId),
  ]);
  return { caseStudies: pieces, ...milestones };
}

/**
 * Resúmenes compactos de casos publicados — consumible por la IA de llamadas
 * como munición de venta ("casos de éxito reales").
 */
export async function getPublishedSummaries(softwareId: string, limit = 5) {
  const pieces = await prisma.contentPiece.findMany({
    where: { softwareId, type: 'CASE_STUDY', status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { id: true, title: true, excerpt: true, publishedAt: true },
  });
  return pieces;
}

export default {
  detectMilestones,
  generateCaseStudyForLead,
  generateMilestoneStory,
  autoGenerateCaseStudies,
  listCaseStudies,
  getPublishedSummaries,
};
