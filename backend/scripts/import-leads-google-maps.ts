/**
 * Importa leads desde Google Maps usando Places API (New) — Text Search.
 *
 * Uso:
 *   npx ts-node scripts/import-leads-google-maps.ts "peluquerías Madrid" --software=peluguau
 *
 * Flags:
 *   --software=ID        (req)  softwareId al que asignar los leads
 *   --origen=...         (opt)  default: "google-maps"
 *   --limit=N            (opt)  default: 1   (Places devuelve máx 20 por página)
 *   --dry-run            (opt)  no inserta, solo printea lo que devolvería Google
 *   --pais=...           (opt)  default: "España"
 *   --priority=ALTA|...  (opt)  default: MEDIA
 *   --region=ES          (opt)  regionCode para Places (default: ES)
 *   --lang=es            (opt)  languageCode para Places (default: es)
 *
 * Idempotencia: si ya existe un lead con el mismo (nombre, softwareId, origen) se salta.
 */

import 'dotenv/config';
import { PrismaClient, LeadEstado, PrioridadLead } from '@prisma/client';

const prisma = new PrismaClient();

// ---------- CLI parsing ----------
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}

const query = positional[0];
if (!query) {
  console.error('❌ Falta el query de búsqueda.');
  console.error('   Ej: npx ts-node scripts/import-leads-google-maps.ts "peluquerías Madrid" --software=peluguau');
  process.exit(1);
}

const softwareId = String(flags.software || '');
if (!softwareId) {
  console.error('❌ Falta --software=<id>');
  process.exit(1);
}

const origen = String(flags.origen || 'google-maps');
const limit = Math.max(1, parseInt(String(flags.limit || '1'), 10));
const dryRun = Boolean(flags['dry-run']);
const pais = String(flags.pais || 'España');
const regionCode = String(flags.region || 'ES');
const languageCode = String(flags.lang || 'es');

const priorityRaw = String(flags.priority || 'MEDIA').toUpperCase();
const validPriorities: PrioridadLead[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as PrioridadLead[];
const prioridad: PrioridadLead = validPriorities.includes(priorityRaw as PrioridadLead)
  ? (priorityRaw as PrioridadLead)
  : ('MEDIA' as PrioridadLead);

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

// ---------- Places API (New) ----------
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

interface PlacesResponse {
  places?: Place[];
  nextPageToken?: string;
}

async function searchText(
  textQuery: string,
  pageSize: number,
  pageToken?: string
): Promise<PlacesResponse> {
  const body: Record<string, unknown> = { textQuery, pageSize, languageCode, regionCode };
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

  return (await res.json()) as PlacesResponse;
}

function buildNotas(p: Place): string {
  const parts: string[] = ['Importado desde Google Maps'];
  if (p.primaryTypeDisplayName?.text) parts.push(`Tipo: ${p.primaryTypeDisplayName.text}`);
  if (p.formattedAddress) parts.push(`Dirección: ${p.formattedAddress}`);
  if (p.rating !== undefined) {
    parts.push(`Google: ${p.rating}⭐ (${p.userRatingCount ?? 0} reseñas)`);
  }
  if (p.websiteUri) parts.push(`Web: ${p.websiteUri}`);
  if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') {
    parts.push(`⚠️ Estado: ${p.businessStatus}`);
  }
  if (p.googleMapsUri) parts.push(`Maps: ${p.googleMapsUri}`);
  return parts.join('\n');
}

// ---------- Main ----------
async function main() {
  console.log(`🔎 Buscando "${query}" en Google Places...`);
  console.log(`   software=${softwareId}  origen=${origen}  limit=${limit}  dryRun=${dryRun}\n`);

  const places: Place[] = [];
  let pageToken: string | undefined;

  while (places.length < limit) {
    const remaining = limit - places.length;
    const pageSize = Math.min(20, remaining);
    const response = await searchText(query, pageSize, pageToken);
    const batch = response.places || [];
    places.push(...batch);
    if (!response.nextPageToken || batch.length === 0) break;
    pageToken = response.nextPageToken;
    await new Promise((r) => setTimeout(r, 500));
  }

  const slice = places.slice(0, limit);
  console.log(`📊 Resultados de Google: ${slice.length}\n`);

  let creados = 0;
  let saltados = 0;

  for (const p of slice) {
    const nombre = p.displayName?.text?.trim();
    if (!nombre) {
      console.log('  ⚠️ Sin nombre, saltando');
      continue;
    }

    const telefono = p.nationalPhoneNumber || p.internationalPhoneNumber || null;

    console.log(`  📍 ${nombre}`);
    console.log(`     📞 ${telefono || '(sin teléfono)'}`);
    console.log(`     🌐 ${p.websiteUri || '(sin web)'}`);
    console.log(`     ⭐ ${p.rating ?? '—'} (${p.userRatingCount ?? 0} reseñas)`);
    console.log(`     📍 ${p.formattedAddress || '—'}`);
    console.log(`     🆔 ${p.id}`);

    if (dryRun) {
      console.log('');
      continue;
    }

    const existing = await prisma.lead.findFirst({
      where: { nombre, softwareId, origen },
    });
    if (existing) {
      console.log('     ↩️  Ya existe → saltado\n');
      saltados++;
      continue;
    }

    await prisma.lead.create({
      data: {
        nombre,
        email: null,
        telefono,
        empresa: nombre,
        pais,
        origen,
        softwareId,
        estado: LeadEstado.NUEVO,
        prioridad,
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
        },
      },
    });
    console.log('     ✅ Lead creado\n');
    creados++;
  }

  if (dryRun) {
    console.log('🧪 Dry-run terminado. Quita --dry-run para insertar.');
  } else {
    console.log(`✅ Creados: ${creados}  |  Ya existían: ${saltados}`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
