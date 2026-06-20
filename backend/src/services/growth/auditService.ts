import OpenAI from 'openai';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { processInboundLead } from './activationService';

// Mismo patrón que whatsappService: respeta el proveedor configurado (OPENAI_BASE_URL)
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_BASE_URL || undefined,
});

// ============================================================
// AUDITORÍA — Lead magnet "¿Cómo está tu negocio?"
// ------------------------------------------------------------
// El visitante mete su web o el nombre de su negocio y recibe al
// instante un mini-informe (web, SEO on-page, ficha de Google,
// reseñas) generado con señales reales + IA. A cambio deja email
// y teléfono → cae como lead caliente en la activación inbound.
// ============================================================

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export interface AuditInput {
  softwareId: string;
  negocio: string;       // nombre del negocio o URL
  url?: string;          // web si la conocen
  nombre?: string;       // nombre de la persona
  email?: string;
  telefono?: string;
  ciudad?: string;       // ayuda a encontrar la ficha de Google
}

interface WebSignals {
  encontrada: boolean;
  url?: string;
  caida?: boolean;
  https?: boolean;
  tiempoMs?: number;
  status?: number;
  title?: string | null;
  metaDescription?: string | null;
  tieneH1?: boolean;
  tieneViewport?: boolean;
  tieneOgTags?: boolean;
  pesoKb?: number;
}

interface FichaSignals {
  encontrada: boolean;
  nombre?: string;
  rating?: number;
  resenas?: number;
  telefono?: string;
  web?: string;
  direccion?: string;
  mapsUri?: string;
}

// ------------------------------------------------------------
// Señales: análisis de la web
// ------------------------------------------------------------

function normalizeUrl(raw: string): string | null {
  let u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

/** Detecta si el texto que metió el visitante parece una URL */
function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text.trim());
}

async function analyzeWeb(rawUrl: string): Promise<WebSignals> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { encontrada: false };

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const start = Date.now();
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const tiempoMs = Date.now() - start;
    clearTimeout(t);

    if (!res.ok) {
      return { encontrada: true, url, caida: res.status >= 500, status: res.status, tiempoMs, https: url.startsWith('https') };
    }

    const html = await res.text();
    const head = html.slice(0, 100_000);

    const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().slice(0, 200) || null;
    const metaDescription =
      head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim().slice(0, 300) ||
      head.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim().slice(0, 300) ||
      null;

    return {
      encontrada: true,
      url: res.url || url,
      caida: false,
      https: (res.url || url).startsWith('https'),
      tiempoMs,
      status: res.status,
      title,
      metaDescription,
      tieneH1: /<h1[\s>]/i.test(html),
      tieneViewport: /<meta[^>]+name=["']viewport["']/i.test(head),
      tieneOgTags: /<meta[^>]+property=["']og:/i.test(head),
      pesoKb: Math.round(html.length / 1024),
    };
  } catch {
    return { encontrada: true, url, caida: true };
  }
}

// ------------------------------------------------------------
// Señales: ficha de Google (Places)
// ------------------------------------------------------------

async function findGoogleListing(query: string): Promise<FichaSignals> {
  if (!PLACES_API_KEY) return { encontrada: false };

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': [
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
        ].join(','),
      },
      body: JSON.stringify({ textQuery: query, pageSize: 1, languageCode: 'es', regionCode: 'ES' }),
    });

    if (!res.ok) return { encontrada: false };
    const data = (await res.json()) as any;
    const place = data.places?.[0];
    if (!place) return { encontrada: false };

    return {
      encontrada: true,
      nombre: place.displayName?.text,
      rating: place.rating,
      resenas: place.userRatingCount,
      telefono: place.nationalPhoneNumber,
      web: place.websiteUri,
      direccion: place.formattedAddress,
      mapsUri: place.googleMapsUri,
    };
  } catch {
    return { encontrada: false };
  }
}

// ------------------------------------------------------------
// Scoring heurístico por áreas (fallback y base para la IA)
// ------------------------------------------------------------

interface Area {
  area: string;
  score: number;
  estado: 'bien' | 'mejorable' | 'mal';
  detalle: string;
}

function estadoDe(score: number): 'bien' | 'mejorable' | 'mal' {
  return score >= 70 ? 'bien' : score >= 40 ? 'mejorable' : 'mal';
}

function scoreAreas(web: WebSignals, ficha: FichaSignals): Area[] {
  const areas: Area[] = [];

  // --- Web ---
  let webScore = 0;
  let webDetalle = 'No hemos encontrado web. Hoy en día, no tener web es perder clientes cada día.';
  if (web.encontrada && !web.caida) {
    webScore = 50;
    const partes: string[] = [];
    if (web.https) { webScore += 10; } else { partes.push('sin HTTPS (Google penaliza y el navegador avisa de "sitio no seguro")'); }
    if (web.tiempoMs != null) {
      if (web.tiempoMs < 1500) webScore += 15;
      else if (web.tiempoMs < 4000) { webScore += 5; partes.push(`carga lenta (${(web.tiempoMs / 1000).toFixed(1)}s)`); }
      else partes.push(`carga muy lenta (${(web.tiempoMs / 1000).toFixed(1)}s)`);
    }
    if (web.tieneViewport) webScore += 10; else partes.push('no está optimizada para móvil');
    if (web.tieneH1) webScore += 5;
    webDetalle = partes.length ? `Web activa pero con problemas: ${partes.join('; ')}.` : 'Web activa, rápida y técnicamente correcta.';
  } else if (web.caida) {
    webScore = 5;
    webDetalle = 'Tu web no responde o está caída. Cada visita que llega ahora mismo se pierde.';
  }
  areas.push({ area: 'Web', score: Math.min(100, webScore), estado: estadoDe(Math.min(100, webScore)), detalle: webDetalle });

  // --- SEO on-page ---
  let seoScore = 0;
  let seoDetalle = 'Sin web no hay SEO posible: invisible en Google fuera del mapa.';
  if (web.encontrada && !web.caida) {
    seoScore = 30;
    const faltan: string[] = [];
    if (web.title) seoScore += 25; else faltan.push('título de página');
    if (web.metaDescription) seoScore += 25; else faltan.push('meta descripción');
    if (web.tieneOgTags) seoScore += 10; else faltan.push('etiquetas para compartir en redes');
    if (web.tieneH1) seoScore += 10;
    seoDetalle = faltan.length
      ? `Le faltan elementos básicos de SEO: ${faltan.join(', ')}. Google no sabe bien qué ofreces.`
      : 'Los elementos básicos de SEO on-page están presentes.';
  }
  areas.push({ area: 'SEO', score: Math.min(100, seoScore), estado: estadoDe(Math.min(100, seoScore)), detalle: seoDetalle });

  // --- Ficha de Google ---
  let fichaScore = 0;
  let fichaDetalle = 'No hemos encontrado tu ficha de Google. La mayoría de clientes locales te buscan ahí primero.';
  if (ficha.encontrada) {
    fichaScore = 50;
    const partes: string[] = [];
    if (ficha.web) fichaScore += 15; else partes.push('sin web enlazada');
    if (ficha.telefono) fichaScore += 15; else partes.push('sin teléfono visible');
    if ((ficha.resenas ?? 0) >= 20) fichaScore += 20;
    else if ((ficha.resenas ?? 0) >= 5) { fichaScore += 10; partes.push(`pocas reseñas (${ficha.resenas})`); }
    else partes.push('casi sin reseñas');
    fichaDetalle = partes.length
      ? `Ficha encontrada pero mejorable: ${partes.join('; ')}.`
      : 'Ficha de Google completa y activa.';
  }
  areas.push({ area: 'Ficha de Google', score: Math.min(100, fichaScore), estado: estadoDe(Math.min(100, fichaScore)), detalle: fichaDetalle });

  // --- Reputación ---
  let repScore = 0;
  let repDetalle = 'Sin reseñas visibles no hay prueba social: los clientes eligen al competidor con estrellas.';
  if (ficha.encontrada && ficha.rating != null) {
    if (ficha.rating >= 4.5) { repScore = 90; repDetalle = `Excelente reputación: ${ficha.rating}★ con ${ficha.resenas} reseñas.`; }
    else if (ficha.rating >= 4.0) { repScore = 70; repDetalle = `Buena reputación (${ficha.rating}★), con margen para subir.`; }
    else if (ficha.rating >= 3.5) { repScore = 45; repDetalle = `Reputación regular (${ficha.rating}★). Las reseñas negativas te están costando clientes.`; }
    else { repScore = 20; repDetalle = `Reputación dañada (${ficha.rating}★). Urgente gestionar y responder reseñas.`; }
  }
  areas.push({ area: 'Reputación', score: repScore, estado: estadoDe(repScore), detalle: repDetalle });

  return areas;
}

// ------------------------------------------------------------
// Informe IA
// ------------------------------------------------------------

async function generateAiReport(
  negocio: string,
  web: WebSignals,
  ficha: FichaSignals,
  areas: Area[],
  softwareNombre?: string
): Promise<{ resumen: string; problemas: string[]; quickWins: string[] } | null> {
  try {
    const prompt = `Eres un consultor de marketing digital para negocios locales. Con estos datos REALES de la auditoría de "${negocio}", escribe un mini-informe directo y honesto en español de España.

DATOS:
${JSON.stringify({ web, ficha, areas }, null, 2)}

Devuelve EXCLUSIVAMENTE JSON válido:
{
  "resumen": "<2-3 frases: diagnóstico global, directo pero constructivo, sin tecnicismos>",
  "problemas": ["<los 3 problemas que más clientes le cuestan, concretos y basados en los datos>"],
  "quickWins": ["<3 acciones que puede hacer esta semana, concretas>"]
}

Reglas: nada genérico, cita los datos reales (segundos de carga, nº de reseñas, rating...). No menciones herramientas concretas${softwareNombre ? ` ni a ${softwareNombre}` : ''}. No inventes datos que no estén arriba.`;

    const response = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 600,
    });

    const content = response.choices[0].message.content;
    if (!content) return null;
    // Parseo robusto: el proveedor puede envolver el JSON en texto/markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.resumen) return null;
    return {
      resumen: String(parsed.resumen),
      problemas: Array.isArray(parsed.problemas) ? parsed.problemas.slice(0, 3).map(String) : [],
      quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 3).map(String) : [],
    };
  } catch (err) {
    logger.warn('[Auditoria] IA falló, se usa informe heurístico:', (err as Error).message);
    return null;
  }
}

/** Informe de respaldo sin IA, construido desde las áreas */
function fallbackReport(areas: Area[]) {
  const malas = areas.filter((a) => a.estado !== 'bien');
  return {
    resumen:
      malas.length === 0
        ? 'Tu presencia digital está en buena forma. Aun así, siempre hay margen para captar más clientes.'
        : `Hemos detectado ${malas.length} área${malas.length > 1 ? 's' : ''} con problemas que te están costando clientes: ${malas.map((a) => a.area.toLowerCase()).join(', ')}.`,
    problemas: malas.slice(0, 3).map((a) => a.detalle),
    quickWins: malas.slice(0, 3).map((a) => `Mejorar ${a.area.toLowerCase()}: ${a.detalle.split('.')[0].toLowerCase()}.`),
  };
}

// ------------------------------------------------------------
// Auditoría principal
// ------------------------------------------------------------

export async function runAuditoria(input: AuditInput) {
  const negocio = input.negocio?.trim();
  if (!negocio) throw new Error('Indica el nombre de tu negocio o tu web.');

  const software = await prisma.software.findUnique({
    where: { id: input.softwareId },
    select: { id: true, nombre: true },
  });
  if (!software) throw new Error('Software no encontrado');

  const audit = await prisma.auditoria.create({
    data: {
      softwareId: input.softwareId,
      negocio,
      url: input.url?.trim() || null,
      nombre: input.nombre?.trim() || null,
      email: input.email?.trim()?.toLowerCase() || null,
      telefono: input.telefono?.trim() || null,
    },
  });

  try {
    // 1) Resolver qué URL analizar: la que dieron, o el propio texto si parece URL
    let urlCandidata = input.url?.trim() || (looksLikeUrl(negocio) ? negocio : undefined);

    // 2) Ficha de Google (en paralelo conceptual: si el input es URL pura, buscar igualmente por dominio)
    const queryFicha = looksLikeUrl(negocio)
      ? negocio.replace(/^https?:\/\//i, '').split('/')[0]
      : `${negocio}${input.ciudad ? ` ${input.ciudad}` : ''}`;
    const ficha = await findGoogleListing(queryFicha);

    // Si no nos dieron web pero la ficha tiene una, analizamos esa
    if (!urlCandidata && ficha.web) urlCandidata = ficha.web;

    const web = urlCandidata ? await analyzeWeb(urlCandidata) : ({ encontrada: false } as WebSignals);

    // 3) Áreas + score global
    const areas = scoreAreas(web, ficha);
    const score = Math.round(areas.reduce((acc, a) => acc + a.score, 0) / areas.length);

    // 4) Informe IA (con fallback heurístico)
    const informe = (await generateAiReport(negocio, web, ficha, areas, software.nombre)) || fallbackReport(areas);

    const resultado = {
      señales: { web, ficha },
      areas,
      ...informe,
    };

    // 5) Crear lead caliente si dejó contacto (activación inbound existente)
    let leadId: string | null = null;
    if (input.email || input.telefono) {
      try {
        const activation = await processInboundLead({
          nombre: input.nombre?.trim() || negocio,
          email: input.email?.trim()?.toLowerCase(),
          telefono: input.telefono?.trim(),
          empresa: ficha.nombre || negocio,
          source: 'auditoria',
          softwareId: input.softwareId,
          metadata: {
            auditoriaId: audit.id,
            auditScore: score,
            auditUrl: web.url || null,
          },
        });
        leadId = activation.leadId;
      } catch (err) {
        logger.warn(`[Auditoria] No se pudo activar el lead de ${audit.id}: ${(err as Error).message}`);
      }
    }

    const updated = await prisma.auditoria.update({
      where: { id: audit.id },
      data: { status: 'done', score, resultado: resultado as any, url: web.url || urlCandidata || null, leadId },
    });

    logger.info(`[Auditoria] ${negocio} auditado. Score ${score}/100. Lead: ${leadId || 'sin contacto'}`);
    return updated;
  } catch (err) {
    await prisma.auditoria.update({
      where: { id: audit.id },
      data: { status: 'error', error: (err as Error).message },
    });
    throw err;
  }
}

// ------------------------------------------------------------
// Lectura
// ------------------------------------------------------------

/** Versión pública del informe (sin PII del visitante) */
export async function getAuditoriaPublica(id: string) {
  const audit = await prisma.auditoria.findUnique({
    where: { id },
    include: { software: { select: { nombre: true, slug: true, colorPrimario: true, logoUrl: true, urlWebsite: true, tagline: true } } },
  });
  if (!audit) return null;
  const { email, telefono, nombre, ...publica } = audit as any;
  return publica;
}

export async function listAuditorias(softwareId: string, limit = 50) {
  const [audits, total, conLead] = await Promise.all([
    prisma.auditoria.findMany({
      where: { softwareId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.auditoria.count({ where: { softwareId } }),
    prisma.auditoria.count({ where: { softwareId, leadId: { not: null } } }),
  ]);
  return {
    audits,
    total,
    conLead,
    tasaConversion: total > 0 ? Math.round((conLead / total) * 100) : 0,
  };
}

export default {
  runAuditoria,
  getAuditoriaPublica,
  listAuditorias,
};
