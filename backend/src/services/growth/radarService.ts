import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { activateLead } from './activationService';

// ============================================================
// RADAR — Cazador de leads automático
// ------------------------------------------------------------
// Cada noche (o a demanda) rastrea negocios que encajan con el ICP
// definido, los puntúa por señales de compra y los deja en el Kanban
// en estado NUEVO con tags automáticos. Reutiliza Google Places (New),
// el scoring y, opcionalmente, la secuencia de activación existente.
// ============================================================

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
  'places.googleMapsUri',
  'places.location',
  'nextPageToken',
].join(',');

// Ciudades por defecto si el ICP no especifica zonas (grandes ciudades de España)
const CIUDADES_DEFAULT = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga',
  'Murcia', 'Palma de Mallorca', 'Las Palmas de Gran Canaria', 'Bilbao',
  'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón',
];

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text: string };
  googleMapsUri?: string;
  location?: { latitude: number; longitude: number };
}

interface PlacesResponse {
  places?: Place[];
  nextPageToken?: string;
}

async function searchText(textQuery: string, pageToken?: string): Promise<PlacesResponse> {
  const body: Record<string, unknown> = {
    textQuery,
    pageSize: 20,
    languageCode: 'es',
    regionCode: 'ES',
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as PlacesResponse;
}

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

export async function getOrCreateConfig(softwareId: string) {
  let config = await prisma.radarConfig.findUnique({ where: { softwareId } });
  if (!config) {
    config = await prisma.radarConfig.create({ data: { softwareId } });
  }
  return config;
}

export async function updateConfig(softwareId: string, data: any) {
  const allowed = {
    enabled: data.enabled,
    sector: data.sector,
    keywords: data.keywords,
    ciudades: data.ciudades,
    pais: data.pais,
    soloSinWeb: data.soloSinWeb,
    ratingMax: data.ratingMax === '' || data.ratingMax == null ? null : Number(data.ratingMax),
    ratingMin: data.ratingMin === '' || data.ratingMin == null ? null : Number(data.ratingMin),
    minResenas: data.minResenas === '' || data.minResenas == null ? null : Number(data.minResenas),
    maxResenas: data.maxResenas === '' || data.maxResenas == null ? null : Number(data.maxResenas),
    excluirCerrados: data.excluirCerrados,
    maxLeadsPorRun: data.maxLeadsPorRun != null ? Number(data.maxLeadsPorRun) : undefined,
    autoSecuencia: data.autoSecuencia,
  };
  // Limpiar undefined para no pisar con undefined en update
  Object.keys(allowed).forEach((k) => (allowed as any)[k] === undefined && delete (allowed as any)[k]);

  return prisma.radarConfig.upsert({
    where: { softwareId },
    update: allowed,
    create: { softwareId, ...allowed },
  });
}

// ------------------------------------------------------------
// Señales de compra + scoring
// ------------------------------------------------------------

interface EvalResult {
  tags: string[];
  score: number;
  passes: boolean;
}

/** Comprueba (best-effort) si una web está caída. Timeout corto para no bloquear el job. */
async function isWebDown(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(t);
    return res.status >= 500 || res.status === 0;
  } catch {
    return true; // no resuelve / error de red = caída
  }
}

async function evaluatePlace(place: Place, config: any): Promise<EvalResult> {
  const tags: string[] = [];
  let score = 40;

  const tieneWeb = !!place.websiteUri;
  const rating = place.rating;
  const reviews = place.userRatingCount ?? 0;
  const tieneTelefono = !!(place.nationalPhoneNumber || place.internationalPhoneNumber);
  const cerrado = place.businessStatus && place.businessStatus !== 'OPERATIONAL';

  // --- Filtros duros del ICP ---
  if (config.excluirCerrados && cerrado) return { tags, score: 0, passes: false };
  if (config.soloSinWeb && tieneWeb) return { tags, score: 0, passes: false };
  if (config.ratingMax != null && rating != null && rating > config.ratingMax) {
    return { tags, score: 0, passes: false };
  }
  if (config.ratingMin != null && rating != null && rating < config.ratingMin) {
    return { tags, score: 0, passes: false };
  }
  if (config.minResenas != null && reviews < config.minResenas) {
    return { tags, score: 0, passes: false };
  }
  if (config.maxResenas != null && reviews > config.maxResenas) {
    return { tags, score: 0, passes: false };
  }

  // --- Señales de compra (suman score + tags) ---
  if (!tieneWeb) {
    tags.push('sin-web');
    score += 20;
  } else {
    const down = await isWebDown(place.websiteUri!);
    if (down) {
      tags.push('web-caida');
      score += 18;
    }
  }

  if (rating != null && rating <= 3.5 && reviews >= 5) {
    tags.push('resenas-malas');
    score += 15;
  }

  if (reviews > 0 && reviews < 15) {
    tags.push('negocio-nuevo');
    score += 10;
  }

  if (tieneTelefono) {
    tags.push('contactable');
    score += 12;
  }

  score = Math.max(0, Math.min(100, score));
  return { tags, score, passes: true };
}

// ------------------------------------------------------------
// Run principal
// ------------------------------------------------------------

export async function runRadar(
  softwareId: string,
  opts: { trigger?: 'manual' | 'cron'; dryRun?: boolean } = {}
) {
  const config = await getOrCreateConfig(softwareId);

  if (!config.sector?.trim()) {
    throw new Error('El Radar necesita un sector definido en el ICP antes de rastrear.');
  }
  if (!PLACES_API_KEY) {
    throw new Error('Falta GOOGLE_PLACES_API_KEY en el entorno para usar el Radar.');
  }

  const run = await prisma.radarRun.create({
    data: { configId: config.id, softwareId, trigger: opts.trigger || 'manual', status: 'running' },
  });

  let scanned = 0;
  let matched = 0;
  let created = 0;
  let skipped = 0;

  try {
    const ciudades = config.ciudades.length > 0 ? config.ciudades : CIUDADES_DEFAULT;
    const sector = config.sector.trim();

    // Pre-cargar dedupe: placeIds y nombres ya existentes en este software
    const existentes = await prisma.lead.findMany({
      where: { softwareId },
      select: { nombre: true, metadata: true },
    });
    const placeIdsVistos = new Set<string>();
    const nombresVistos = new Set<string>();
    for (const l of existentes) {
      const pid = (l.metadata as any)?.googlePlaceId;
      if (pid) placeIdsVistos.add(pid);
      if (l.nombre) nombresVistos.add(l.nombre.trim().toLowerCase());
    }

    const maxLeads = config.maxLeadsPorRun || 40;
    const nuevosLeads: any[] = [];

    outer: for (const ciudad of ciudades) {
      let pageToken: string | undefined;
      for (let page = 0; page < 2; page++) {
        const resp = await searchText(`${sector} ${ciudad}`, pageToken);
        const places = resp.places || [];
        scanned += places.length;

        for (const place of places) {
          if (created >= maxLeads) break outer;

          const nombre = place.displayName?.text?.trim();
          if (!nombre) continue;

          // Dedupe
          if (placeIdsVistos.has(place.id) || nombresVistos.has(nombre.toLowerCase())) {
            skipped++;
            continue;
          }

          const evalRes = await evaluatePlace(place, config);
          if (!evalRes.passes) {
            skipped++;
            continue;
          }
          matched++;

          // Marcar como visto para no duplicar dentro del mismo run
          placeIdsVistos.add(place.id);
          nombresVistos.add(nombre.toLowerCase());

          const telefono = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
          const prioridad = evalRes.score >= 75 ? 'ALTA' : evalRes.score >= 55 ? 'MEDIA' : 'BAJA';

          const notas = [
            `Detectado por Radar (${sector} · ${ciudad}).`,
            `Score: ${evalRes.score}/100`,
            evalRes.tags.length ? `Señales: ${evalRes.tags.join(', ')}` : null,
            place.formattedAddress ? `Dirección: ${place.formattedAddress}` : null,
            place.websiteUri ? `Web: ${place.websiteUri}` : 'Sin web',
            place.rating != null ? `Rating: ${place.rating} (${place.userRatingCount || 0} reseñas)` : null,
            place.googleMapsUri ? `Maps: ${place.googleMapsUri}` : null,
          ]
            .filter(Boolean)
            .join('\n');

          if (opts.dryRun) {
            nuevosLeads.push({ nombre, ciudad, score: evalRes.score, tags: evalRes.tags, telefono });
            created++;
            continue;
          }

          const lead = await prisma.lead.create({
            data: {
              nombre,
              empresa: nombre,
              telefono,
              pais: config.pais || 'España',
              origen: 'radar',
              softwareId,
              estado: 'NUEVO',
              prioridad: prioridad as any,
              notas,
              metadata: {
                googlePlaceId: place.id,
                radarScore: evalRes.score,
                radarTags: evalRes.tags,
                radarRunId: run.id,
                radarCiudad: ciudad,
                websiteUri: place.websiteUri || null,
                rating: place.rating ?? null,
                userRatingCount: place.userRatingCount ?? null,
                googleMapsUri: place.googleMapsUri || null,
                businessStatus: place.businessStatus || null,
                lat: place.location?.latitude ?? null,
                lon: place.location?.longitude ?? null,
              },
            },
          });

          await prisma.leadHistorial.create({
            data: {
              leadId: lead.id,
              tipo: 'RADAR',
              descripcion: `Lead captado por Radar. Score ${evalRes.score}/100. Señales: ${evalRes.tags.join(', ') || 'ninguna'}.`,
            },
          });

          // Lanzar secuencia de outreach automáticamente si está activado
          if (config.autoSecuencia) {
            try {
              await activateLead(lead.id, 'radar');
            } catch (err) {
              logger.warn(`[Radar] No se pudo activar lead ${lead.id}: ${(err as Error).message}`);
            }
          }

          nuevosLeads.push({ id: lead.id, nombre, ciudad, score: evalRes.score, tags: evalRes.tags });
          created++;
        }

        if (!resp.nextPageToken || places.length === 0) break;
        pageToken = resp.nextPageToken;
      }
    }

    await prisma.radarRun.update({
      where: { id: run.id },
      data: { status: 'done', scanned, matched, created, skipped, finishedAt: new Date() },
    });
    if (!opts.dryRun) {
      await prisma.radarConfig.update({
        where: { id: config.id },
        data: { ultimoRun: new Date() },
      });
    }

    logger.info(
      `[Radar] ${softwareId}: escaneados ${scanned}, ICP ${matched}, creados ${created}, descartados ${skipped}`
    );

    return { runId: run.id, scanned, matched, created, skipped, dryRun: !!opts.dryRun, leads: nuevosLeads };
  } catch (err) {
    await prisma.radarRun.update({
      where: { id: run.id },
      data: { status: 'error', error: (err as Error).message, scanned, matched, created, skipped, finishedAt: new Date() },
    });
    throw err;
  }
}

export async function getRuns(softwareId: string, limit = 20) {
  return prisma.radarRun.findMany({
    where: { softwareId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

/** Resumen para el dashboard: config + último run + leads del radar. */
export async function getRadarSummary(softwareId: string) {
  const [config, lastRun, totalLeads] = await Promise.all([
    getOrCreateConfig(softwareId),
    prisma.radarRun.findFirst({ where: { softwareId }, orderBy: { startedAt: 'desc' } }),
    prisma.lead.count({ where: { softwareId, origen: 'radar' } }),
  ]);
  return { config, lastRun, totalLeads };
}

export default {
  getOrCreateConfig,
  updateConfig,
  runRadar,
  getRuns,
  getRadarSummary,
};
