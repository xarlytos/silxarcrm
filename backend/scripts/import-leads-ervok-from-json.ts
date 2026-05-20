/**
 * Importa a la BD los leads del scan de PYMES (output/leads-pymes-ervok-*.json).
 *
 * Mapeo prioridad:
 *   ALTA  → SIN_WEB        ("te hacemos software a medida desde cero")
 *   ALTA  → WEB_MALA       ("te rehacemos sistema con software a medida")
 *   MEDIA → WEB_REGULAR    ("mejoras y nuevas funcionalidades")
 *   MEDIA → WEB_SIN_ANALIZAR  (pendiente de análisis PageSpeed)
 *   BAJA  → WEB_OK         (poca oportunidad)
 *   BAJA  → WEB_INALCANZABLE  (web caída)
 *
 * Idempotente: dedup por metadata.googlePlaceId.
 *
 * Uso:
 *   npx ts-node scripts/import-leads-ervok-from-json.ts --dry-run
 *   npx ts-node scripts/import-leads-ervok-from-json.ts
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
const softwareId = String(flags.software || 'ervok');
const origen = String(flags.origen || 'google-maps-pyme');

function findLatestScan(): string {
  const outDir = path.join(__dirname, 'output');
  const candidates = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('leads-pymes-ervok-') && f.endsWith('.json'))
    .map((f) => path.join(outDir, f))
    .sort();
  if (!candidates.length) throw new Error('No scan JSON encontrado en scripts/output/');
  return candidates[candidates.length - 1];
}
const inputFile = flags.file ? String(flags.file) : findLatestScan();

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface WebAnalysis {
  url: string;
  reachable: boolean;
  pagespeedMobile?: number;
  pagespeedDesktop?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  isHttps?: boolean;
  error?: string;
}

interface Lead {
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
  sectorBusqueda: string;
  ciudadBusqueda: string;
  clasificacion: string;
  webAnalysis?: WebAnalysis;
}

function classifyToPriority(c: string): PrioridadLead {
  switch (c) {
    case 'SIN_WEB':
    case 'WEB_MALA':
      return 'ALTA' as PrioridadLead;
    case 'WEB_REGULAR':
    case 'WEB_SIN_ANALIZAR':
      return 'MEDIA' as PrioridadLead;
    case 'WEB_OK':
    case 'WEB_INALCANZABLE':
    default:
      return 'BAJA' as PrioridadLead;
  }
}

function extractMunicipio(l: Lead): string | null {
  for (const c of l.addressComponents || []) {
    if (c.types?.includes('locality') || c.types?.includes('postal_town')) {
      return c.longText || c.shortText || null;
    }
  }
  return l.ciudadBusqueda || null;
}

function extractProvincia(l: Lead): string | null {
  for (const c of l.addressComponents || []) {
    if (c.types?.includes('administrative_area_level_2')) {
      return c.longText || c.shortText || null;
    }
  }
  return null;
}

function extractCP(l: Lead): string | null {
  for (const c of l.addressComponents || []) {
    if (c.types?.includes('postal_code')) return c.longText || c.shortText || null;
  }
  return null;
}

function buildNotas(l: Lead): string {
  const parts: string[] = [];
  parts.push(`Importado scan PYMES (sector buscado: ${l.sectorBusqueda})`);
  parts.push(`Clasificación: ${l.clasificacion}`);
  if (l.primaryTypeDisplayName?.text) parts.push(`Tipo Google: ${l.primaryTypeDisplayName.text}`);
  if (l.formattedAddress) parts.push(`Dirección: ${l.formattedAddress}`);
  if (l.rating !== undefined) parts.push(`Google: ${l.rating}⭐ (${l.userRatingCount ?? 0} reseñas)`);
  if (l.websiteUri) parts.push(`Web: ${l.websiteUri}`);
  if (l.webAnalysis?.pagespeedMobile !== undefined) {
    parts.push(`PageSpeed mobile: ${l.webAnalysis.pagespeedMobile}/100`);
  }
  if (l.businessStatus && l.businessStatus !== 'OPERATIONAL') {
    parts.push(`⚠️ Estado: ${l.businessStatus}`);
  }
  if (l.googleMapsUri) parts.push(`Maps: ${l.googleMapsUri}`);
  return parts.join('\n');
}

async function main() {
  console.log(`📂 Fichero: ${inputFile}`);
  console.log(`   softwareId=${softwareId}  origen=${origen}  dryRun=${dryRun}\n`);

  const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const leads: Lead[] = data.leads || [];
  console.log(`📊 Total en scan: ${leads.length}\n`);

  const existing = await prisma.lead.findMany({
    where: { softwareId, origen },
    select: { metadata: true },
  });
  const existingPlaceIds = new Set<string>();
  for (const l of existing) {
    const meta = l.metadata as { googlePlaceId?: string } | null;
    if (meta?.googlePlaceId) existingPlaceIds.add(meta.googlePlaceId);
  }
  console.log(`📦 Leads ya en BD: ${existingPlaceIds.size}\n`);

  const candidates: { lead: Lead; prioridad: PrioridadLead }[] = [];
  let yaExistian = 0;

  for (const l of leads) {
    if (!l.displayName?.text) continue;
    if (existingPlaceIds.has(l.id)) {
      yaExistian++;
      continue;
    }
    candidates.push({ lead: l, prioridad: classifyToPriority(l.clasificacion) });
  }

  const porPrio = { ALTA: 0, MEDIA: 0, BAJA: 0 };
  const porClasif: Record<string, number> = {};
  for (const c of candidates) {
    porPrio[c.prioridad as keyof typeof porPrio]++;
    porClasif[c.lead.clasificacion] = (porClasif[c.lead.clasificacion] || 0) + 1;
  }

  console.log(`🔍 Análisis pre-import:`);
  console.log(`   Total scan:         ${leads.length}`);
  console.log(`   Ya existían en BD:  ${yaExistian}`);
  console.log(`   Candidatos:         ${candidates.length}`);
  console.log(`     ALTA  → ${porPrio.ALTA}`);
  console.log(`     MEDIA → ${porPrio.MEDIA}`);
  console.log(`     BAJA  → ${porPrio.BAJA}`);
  console.log(`\n   Por clasificación:`);
  for (const [c, n] of Object.entries(porClasif).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${c.padEnd(22)} ${n}`);
  }

  if (dryRun) {
    console.log(`\n🧪 Dry-run. Para importar: quita --dry-run`);
    return;
  }

  console.log(`\n🚀 Insertando ${candidates.length} leads...`);
  const stats = { creados: 0, errores: 0 };
  const BATCH = 50;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ({ lead, prioridad }) => {
        try {
          const nombre = lead.displayName!.text.trim();
          const telefono = lead.nationalPhoneNumber || lead.internationalPhoneNumber || null;
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
              notas: buildNotas(lead),
              metadata: {
                googlePlaceId: lead.id,
                googleMapsUri: lead.googleMapsUri,
                websiteUri: lead.websiteUri,
                rating: lead.rating,
                userRatingCount: lead.userRatingCount,
                businessStatus: lead.businessStatus,
                types: lead.types,
                primaryType: lead.primaryType,
                primaryTypeDisplayName: lead.primaryTypeDisplayName?.text,
                formattedAddress: lead.formattedAddress,
                location: lead.location,
                municipio: extractMunicipio(lead),
                provincia: extractProvincia(lead),
                codigoPostal: extractCP(lead),
                sectorBusqueda: lead.sectorBusqueda,
                ciudadBusqueda: lead.ciudadBusqueda,
                clasificacionWeb: lead.clasificacion,
                webAnalysis: lead.webAnalysis,
              } as any,
            },
          });
          stats.creados++;
        } catch (err) {
          stats.errores++;
          console.error(`  ❌ ${lead.displayName?.text}: ${(err as Error).message}`);
        }
      })
    );
    process.stdout.write(`  ${Math.min(i + BATCH, candidates.length)}/${candidates.length}\r`);
  }
  console.log(`\n\n✅ Creados: ${stats.creados}  | Errores: ${stats.errores}  | Ya existían: ${yaExistian}`);
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
