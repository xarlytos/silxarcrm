/**
 * Expansión de leads para los 4 softwares Atleevo*:
 *   1. Añade 2 términos de búsqueda alternativos por software (en las 8 ciudades originales).
 *   2. Añade 12 ciudades nuevas (top 20 España) con los 3 términos por software.
 *
 * Idempotente: deduplica por (nombre, softwareId, origen='google-maps').
 * Combos ya ejecutados (término principal × 8 ciudades originales) NO se relanzan.
 */
import 'dotenv/config';
import { PrismaClient, LeadEstado, PrioridadLead } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

const ORIGINAL_CITIES = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Bilbao', 'Palma de Mallorca'];
const NEW_CITIES = [
  'Murcia',
  'Las Palmas de Gran Canaria',
  'Alicante',
  'Córdoba',
  'Valladolid',
  'Vigo',
  'Gijón',
  'A Coruña',
  'Vitoria-Gasteiz',
  'Granada',
  'Elche',
  'Santa Cruz de Tenerife',
];

interface SoftwareConfig {
  software: string;
  mainTerm: string;
  variantTerms: string[];
}

const SOFTWARES: SoftwareConfig[] = [
  {
    software: 'atleevo',
    mainTerm: 'entrenador personal',
    variantTerms: ['personal trainer', 'preparador físico'],
  },
  {
    software: 'atleevogym',
    mainTerm: 'gimnasio',
    variantTerms: ['centro fitness', 'club deportivo fitness'],
  },
  {
    software: 'atleevoyoga',
    mainTerm: 'estudio de yoga',
    variantTerms: ['centro de yoga', 'ashtanga yoga'],
  },
  {
    software: 'atleevobox',
    mainTerm: 'gimnasio de boxeo',
    variantTerms: ['club de boxeo', 'escuela de boxeo'],
  },
];

const LIMIT_PER_QUERY = 60;
const ORIGEN = 'google-maps';
const PAIS = 'España';

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
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.googleMapsUri',
  'places.location',
  'nextPageToken',
].join(',');

interface Place {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  googleMapsUri?: string;
  location?: { latitude: number; longitude: number };
}

async function searchText(textQuery: string, pageSize: number, pageToken?: string) {
  const body: Record<string, unknown> = {
    textQuery,
    pageSize,
    languageCode: 'es',
    regionCode: 'ES',
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as { places?: Place[]; nextPageToken?: string };
}

function buildNotas(p: Place): string {
  const parts: string[] = ['Importado desde Google Maps'];
  if (p.primaryTypeDisplayName?.text) parts.push(`Tipo: ${p.primaryTypeDisplayName.text}`);
  if (p.formattedAddress) parts.push(`Dirección: ${p.formattedAddress}`);
  if (p.rating !== undefined) parts.push(`Google: ${p.rating}⭐ (${p.userRatingCount ?? 0} reseñas)`);
  if (p.websiteUri) parts.push(`Web: ${p.websiteUri}`);
  if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') parts.push(`⚠️ Estado: ${p.businessStatus}`);
  if (p.googleMapsUri) parts.push(`Maps: ${p.googleMapsUri}`);
  return parts.join('\n');
}

async function importBatch(query: string, softwareId: string, city: string) {
  const places: Place[] = [];
  let pageToken: string | undefined;
  while (places.length < LIMIT_PER_QUERY) {
    const remaining = LIMIT_PER_QUERY - places.length;
    const pageSize = Math.min(20, remaining);
    const resp = await searchText(query, pageSize, pageToken);
    const batch = resp.places || [];
    places.push(...batch);
    if (!resp.nextPageToken || batch.length === 0) break;
    pageToken = resp.nextPageToken;
    await new Promise((r) => setTimeout(r, 500));
  }

  let creados = 0;
  let saltados = 0;

  for (const p of places) {
    const nombre = p.displayName?.text?.trim();
    if (!nombre) continue;
    const telefono = p.nationalPhoneNumber || p.internationalPhoneNumber || null;

    const existing = await prisma.lead.findFirst({
      where: { nombre, softwareId, origen: ORIGEN },
    });
    if (existing) {
      saltados++;
      continue;
    }

    await prisma.lead.create({
      data: {
        nombre,
        email: null,
        telefono,
        empresa: nombre,
        pais: PAIS,
        origen: ORIGEN,
        softwareId,
        estado: LeadEstado.NUEVO,
        prioridad: PrioridadLead.MEDIA,
        notas: buildNotas(p),
        metadata: {
          googlePlaceId: p.id,
          googleMapsUri: p.googleMapsUri,
          websiteUri: p.websiteUri,
          rating: p.rating,
          userRatingCount: p.userRatingCount,
          businessStatus: p.businessStatus,
          types: p.types,
          primaryType: p.primaryType,
          primaryTypeDisplayName: p.primaryTypeDisplayName?.text,
          formattedAddress: p.formattedAddress,
          location: p.location,
          ciudad: city,
          queryTerm: query,
        },
      },
    });
    creados++;
  }

  return { totalRecibidos: places.length, creados, saltados };
}

async function main() {
  const t0 = Date.now();

  // Build query plan
  type Plan = { software: string; term: string; city: string };
  const plan: Plan[] = [];

  for (const { software, mainTerm, variantTerms } of SOFTWARES) {
    // 8 ciudades originales: SOLO términos variantes (el principal ya se ejecutó)
    for (const city of ORIGINAL_CITIES) {
      for (const term of variantTerms) plan.push({ software, term, city });
    }
    // 12 ciudades nuevas: TODOS los términos (principal + variantes)
    for (const city of NEW_CITIES) {
      for (const term of [mainTerm, ...variantTerms]) plan.push({ software, term, city });
    }
  }

  console.log(`🚀 Plan de expansión: ${plan.length} queries`);
  console.log(`   ${SOFTWARES.length} softwares × (${ORIGINAL_CITIES.length} cities × 2 variants + ${NEW_CITIES.length} cities × 3 terms)\n`);

  const resumen: Record<string, { creados: number; saltados: number; total: number; queriesEjecutadas: number }> = {};
  for (const { software } of SOFTWARES) resumen[software] = { creados: 0, saltados: 0, total: 0, queriesEjecutadas: 0 };

  let qIdx = 0;
  for (const { software, term, city } of plan) {
    qIdx++;
    const query = `${term} ${city}`;
    try {
      const { totalRecibidos, creados, saltados } = await importBatch(query, software, city);
      resumen[software].creados += creados;
      resumen[software].saltados += saltados;
      resumen[software].total += totalRecibidos;
      resumen[software].queriesEjecutadas++;
      console.log(`  [${String(qIdx).padStart(3)}/${plan.length}] ${software.padEnd(12)} "${term}" ${city.padEnd(24)} recv=${totalRecibidos}  +${creados}  dup=${saltados}`);
    } catch (err) {
      console.error(`  [${qIdx}/${plan.length}] ${software} "${term}" ${city} ❌`, err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n📊 Resumen expansión (${dt}s):`);
  let totalCreados = 0;
  for (const { software } of SOFTWARES) {
    const r = resumen[software];
    totalCreados += r.creados;
    console.log(`  ${software.padEnd(14)} queries=${r.queriesEjecutadas}  recibidos=${r.total}  creados=${r.creados}  duplicados=${r.saltados}`);
  }
  console.log(`\n✅ TOTAL nuevos leads creados en esta expansión: ${totalCreados}`);

  // Estado final por software (incluyendo lote anterior)
  console.log(`\n📈 Total acumulado por software (origen=google-maps):`);
  for (const { software } of SOFTWARES) {
    const count = await prisma.lead.count({ where: { softwareId: software, origen: ORIGEN } });
    console.log(`  ${software.padEnd(14)} ${count}`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
