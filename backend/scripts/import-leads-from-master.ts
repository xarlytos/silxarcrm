/**
 * Importa leads a la BD desde un master JSON generado por los scripts de scan.
 *
 * Filtros aplicados (modo "equilibrado"):
 *   - Excluye cadenas grandes (Kiwoko, Tiendanimal, Verdecora, Miscota, Maxi Zoo...)
 *   - Calcula prioridad automática:
 *       ALTA  → rating ≥ 4.5 AND ≥ 50 reseñas AND tiene web
 *       BAJA  → < 5 reseñas OR sin teléfono OR no operational
 *       MEDIA → resto
 *
 * Idempotencia:
 *   - Usa metadata.googlePlaceId como clave única dentro del software.
 *   - Si ya existe un lead con ese placeId, se salta.
 *
 * Uso:
 *   npx ts-node scripts/import-leads-from-master.ts --dry-run
 *   npx ts-node scripts/import-leads-from-master.ts
 *   npx ts-node scripts/import-leads-from-master.ts --file=scripts/output/foo.json
 *   npx ts-node scripts/import-leads-from-master.ts --software=peluguau --origen=google-maps
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient, LeadEstado, PrioridadLead } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}

const dryRun = Boolean(flags['dry-run']);
const softwareId = String(flags.software || 'peluguau');
const origen = String(flags.origen || 'google-maps');

// Localiza el master más reciente si no se pasa fichero
function findLatestMaster(): string {
  const outDir = path.join(__dirname, 'output');
  const candidates = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('peluquerias-caninas-espana-MASTER-') && f.endsWith('.json'))
    .map((f) => path.join(outDir, f))
    .sort();
  if (!candidates.length) throw new Error('No master JSON found en scripts/output/');
  return candidates[candidates.length - 1];
}
const inputFile = flags.file ? String(flags.file) : findLatestMaster();

// Cadenas a EXCLUIR (case-insensitive substring match en displayName)
const CHAIN_BLACKLIST = [
  'kiwoko',
  'tiendanimal',
  'verdecora',
  'miscota',
  'maxi zoo',
  'maxizoo',
  'petclic',
  'petlandia',
  'leroy merlin',
  'leroymerlin',
  'agrobroker',
  'agrocantueso',
  'masquepet',
  'mas que pet',
];

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
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
  editorialSummary?: { text: string };
  ciudadBusqueda?: string;
  queryUsed?: string;
}

function isChain(nombre: string): string | null {
  const lower = nombre.toLowerCase();
  for (const c of CHAIN_BLACKLIST) {
    if (lower.includes(c)) return c;
  }
  return null;
}

function computePrioridad(p: Place): PrioridadLead {
  const rating = p.rating || 0;
  const reviews = p.userRatingCount || 0;
  const hasWeb = Boolean(p.websiteUri);
  const hasPhone = Boolean(p.nationalPhoneNumber || p.internationalPhoneNumber);
  const operational = !p.businessStatus || p.businessStatus === 'OPERATIONAL';

  if (rating >= 4.5 && reviews >= 50 && hasWeb && operational) return 'ALTA' as PrioridadLead;
  if (reviews < 5 || !hasPhone || !operational) return 'BAJA' as PrioridadLead;
  return 'MEDIA' as PrioridadLead;
}

function extractMunicipio(p: Place): string | null {
  const ac = p.addressComponents || [];
  for (const c of ac) {
    if (c.types?.includes('locality') || c.types?.includes('postal_town')) {
      return c.longText || c.shortText || null;
    }
  }
  return p.ciudadBusqueda || null;
}

function extractProvincia(p: Place): string | null {
  const ac = p.addressComponents || [];
  for (const c of ac) {
    if (c.types?.includes('administrative_area_level_2')) {
      return c.longText || c.shortText || null;
    }
  }
  return null;
}

function extractCP(p: Place): string | null {
  const ac = p.addressComponents || [];
  for (const c of ac) {
    if (c.types?.includes('postal_code')) {
      return c.longText || c.shortText || null;
    }
  }
  return null;
}

function buildNotas(p: Place): string {
  const parts: string[] = [];
  parts.push('Importado desde Google Maps');
  if (p.primaryTypeDisplayName?.text) parts.push(`Tipo: ${p.primaryTypeDisplayName.text}`);
  if (p.formattedAddress) parts.push(`Dirección: ${p.formattedAddress}`);
  if (p.rating !== undefined) {
    parts.push(`Google: ${p.rating}⭐ (${p.userRatingCount ?? 0} reseñas)`);
  }
  if (p.websiteUri) parts.push(`Web: ${p.websiteUri}`);
  if (p.editorialSummary?.text) parts.push(`Descripción Google: ${p.editorialSummary.text}`);
  if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') {
    parts.push(`⚠️ Estado: ${p.businessStatus}`);
  }
  if (p.googleMapsUri) parts.push(`Maps: ${p.googleMapsUri}`);
  return parts.join('\n');
}

async function main() {
  console.log(`📂 Fichero de entrada: ${inputFile}`);
  console.log(`   softwareId=${softwareId}  origen=${origen}  dryRun=${dryRun}\n`);

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const places: Place[] = data.places || [];
  console.log(`📊 Total en master: ${places.length}\n`);

  // Pre-cargar todos los googlePlaceIds ya existentes en BD para evitar N queries
  const existing = await prisma.lead.findMany({
    where: { softwareId, origen },
    select: { metadata: true },
  });
  const existingPlaceIds = new Set<string>();
  for (const l of existing) {
    const meta = l.metadata as { googlePlaceId?: string } | null;
    if (meta?.googlePlaceId) existingPlaceIds.add(meta.googlePlaceId);
  }
  console.log(`📦 Leads ya en BD (origen=${origen}, software=${softwareId}): ${existingPlaceIds.size}\n`);

  const stats = {
    total: places.length,
    excluidasCadenas: 0,
    yaExistian: 0,
    candidatos: 0,
    porPrioridad: { ALTA: 0, MEDIA: 0, BAJA: 0, URGENTE: 0 },
    cadenasDetectadas: {} as Record<string, number>,
    creados: 0,
    errores: 0,
  };

  const candidates: { place: Place; prioridad: PrioridadLead }[] = [];

  for (const p of places) {
    const nombre = p.displayName?.text?.trim();
    if (!nombre) continue;

    // Skip cadenas
    const chain = isChain(nombre);
    if (chain) {
      stats.excluidasCadenas++;
      stats.cadenasDetectadas[chain] = (stats.cadenasDetectadas[chain] || 0) + 1;
      continue;
    }

    // Skip ya existentes
    if (existingPlaceIds.has(p.id)) {
      stats.yaExistian++;
      continue;
    }

    const prioridad = computePrioridad(p);
    stats.porPrioridad[prioridad as keyof typeof stats.porPrioridad]++;
    stats.candidatos++;
    candidates.push({ place: p, prioridad });
  }

  console.log(`🔍 Análisis pre-import:`);
  console.log(`   Total master:           ${stats.total}`);
  console.log(`   Cadenas excluidas:      ${stats.excluidasCadenas}`);
  for (const [c, n] of Object.entries(stats.cadenasDetectadas).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${n.toString().padStart(3)}× ${c}`);
  }
  console.log(`   Ya existían en BD:      ${stats.yaExistian}`);
  console.log(`   Candidatos a crear:     ${stats.candidatos}`);
  console.log(`     ALTA  → ${stats.porPrioridad.ALTA}`);
  console.log(`     MEDIA → ${stats.porPrioridad.MEDIA}`);
  console.log(`     BAJA  → ${stats.porPrioridad.BAJA}`);

  // Muestra de 5 leads a importar
  console.log(`\n🔎 Muestra (5 leads que se crearían):`);
  for (const { place, prioridad } of candidates.slice(0, 5)) {
    const nombre = place.displayName?.text;
    const tel = place.nationalPhoneNumber || place.internationalPhoneNumber || '(sin tel)';
    const rating = place.rating ? `${place.rating}⭐ (${place.userRatingCount || 0})` : '—';
    console.log(`   [${prioridad.padEnd(5)}] ${nombre} | ${tel} | ${rating} | ${extractMunicipio(place) || '?'}`);
  }

  if (dryRun) {
    console.log(`\n🧪 Dry-run terminado. Para importar de verdad: quita --dry-run`);
    return;
  }

  console.log(`\n🚀 Insertando ${candidates.length} leads en BD...`);
  const BATCH = 100;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ place, prioridad }) => {
        try {
          const nombre = place.displayName!.text.trim();
          const telefono = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
          const municipio = extractMunicipio(place);
          const provincia = extractProvincia(place);
          const cp = extractCP(place);

          await prisma.lead.create({
            data: {
              nombre,
              email: null,
              telefono,
              empresa: nombre,
              pais: 'España',
              origen,
              softwareId,
              estado: LeadEstado.NUEVO,
              prioridad,
              notas: buildNotas(place),
              metadata: {
                googlePlaceId: place.id,
                googleMapsUri: place.googleMapsUri,
                websiteUri: place.websiteUri,
                rating: place.rating,
                userRatingCount: place.userRatingCount,
                businessStatus: place.businessStatus,
                types: place.types,
                primaryType: place.primaryType,
                primaryTypeDisplayName: place.primaryTypeDisplayName?.text,
                formattedAddress: place.formattedAddress,
                location: place.location,
                municipio,
                provincia,
                codigoPostal: cp,
                ciudadBusqueda: place.ciudadBusqueda,
                queryUsed: place.queryUsed,
                editorialSummary: place.editorialSummary?.text,
              },
            },
          });
          stats.creados++;
        } catch (err) {
          stats.errores++;
          console.error(`  ❌ Error en ${place.displayName?.text}: ${(err as Error).message}`);
        }
      })
    );
    process.stdout.write(`  ${Math.min(i + BATCH, candidates.length)}/${candidates.length}\r`);
  }

  console.log(`\n\n✅ Resumen final:`);
  console.log(`   Creados:    ${stats.creados}`);
  console.log(`   Errores:    ${stats.errores}`);
  console.log(`   Saltados (ya existían):  ${stats.yaExistian}`);
  console.log(`   Saltados (cadenas):      ${stats.excluidasCadenas}`);
}

main()
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
