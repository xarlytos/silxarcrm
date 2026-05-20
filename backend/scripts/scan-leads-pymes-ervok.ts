/**
 * Scan de PYMES con problemas de presencia digital para vender desarrollo web/app.
 *
 * Estrategia:
 *   1. Para cada (sector × ciudad), busca en Google Places API negocios reales.
 *   2. Clasifica cada negocio:
 *        SIN_WEB     → no aparece web en Google           → lead ALTA ("te hacemos una")
 *        WEB_MALA    → web con PageSpeed mobile <50       → lead ALTA ("te la rehacemos")
 *        WEB_REGULAR → PageSpeed mobile 50-79             → lead MEDIA
 *        WEB_OK      → PageSpeed mobile ≥80               → lead BAJA (poca oportunidad)
 *   3. Guarda JSON con análisis completo.
 *
 * Sectores y ciudades por defecto son una muestra de test. Edita los arrays para escalar.
 *
 * Uso:
 *   npx ts-node scripts/scan-leads-pymes-ervok.ts                  # test: 4 sectores × 5 ciudades
 *   npx ts-node scripts/scan-leads-pymes-ervok.ts --skip-pagespeed # solo Places, sin analizar webs (rápido)
 *   npx ts-node scripts/scan-leads-pymes-ervok.ts --max-pagespeed=50  # tope de análisis PageSpeed
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}

const skipPagespeed = Boolean(flags['skip-pagespeed']);
const maxPagespeed = flags['max-pagespeed'] ? parseInt(String(flags['max-pagespeed']), 10) : undefined;
const concurrency = parseInt(String(flags.concurrency || '5'), 10);

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

// === Sectores y ciudades (edita para ampliar) ===
const SECTORES = [
  'clínica dental',
  'gimnasio',
  'asesoría fiscal',
  'taller mecánico',
  'restaurante',
  'peluquería',
  'veterinaria',
  'fisioterapia',
  'inmobiliaria',
  'farmacia',
  'óptica',
  'academia de idiomas',
];

const CIUDADES = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Málaga',
  'Zaragoza',
  'Bilbao',
  'Alicante',
  'Córdoba',
  'Granada',
  'Valladolid',
  'Murcia',
  'Palma de Mallorca',
];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
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
}

interface WebAnalysis {
  url: string;
  reachable: boolean;
  pagespeedMobile?: number; // 0-100
  pagespeedDesktop?: number;
  lcp?: number; // segundos
  cls?: number;
  fid?: number;
  isHttps?: boolean;
  error?: string;
}

interface EnrichedLead extends Place {
  sectorBusqueda: string;
  ciudadBusqueda: string;
  clasificacion: 'SIN_WEB' | 'WEB_MALA' | 'WEB_REGULAR' | 'WEB_OK' | 'WEB_INALCANZABLE' | 'WEB_SIN_ANALIZAR';
  webAnalysis?: WebAnalysis;
}

async function searchPlaces(query: string, pageSize: number, pageToken?: string) {
  const body: Record<string, unknown> = { textQuery: query, pageSize, languageCode: 'es', regionCode: 'ES' };
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
  if (!res.ok) throw new Error(`Places API HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as { places?: Place[]; nextPageToken?: string };
}

async function scanQuery(query: string): Promise<{ places: Place[]; calls: number }> {
  const all: Place[] = [];
  let pageToken: string | undefined;
  let calls = 0;
  for (let page = 0; page < 3; page++) {
    const res = await searchPlaces(query, 20, pageToken);
    calls++;
    const batch = res.places || [];
    all.push(...batch);
    if (!res.nextPageToken || batch.length === 0) break;
    pageToken = res.nextPageToken;
    await new Promise((r) => setTimeout(r, 250));
  }
  return { places: all, calls };
}

async function analyzeWebsite(url: string): Promise<WebAnalysis> {
  const analysis: WebAnalysis = { url, reachable: false, isHttps: url.startsWith('https://') };

  try {
    const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('strategy', 'mobile');
    apiUrl.searchParams.set('category', 'performance');
    apiUrl.searchParams.set('key', API_KEY!);

    const res = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      analysis.error = `HTTP ${res.status}: ${errText.slice(0, 200)}`;
      return analysis;
    }

    const data: any = await res.json();
    const score = data.lighthouseResult?.categories?.performance?.score;
    if (score !== null && score !== undefined) {
      analysis.pagespeedMobile = Math.round(score * 100);
      analysis.reachable = true;
    }
    const audits = data.lighthouseResult?.audits;
    if (audits) {
      analysis.lcp = audits['largest-contentful-paint']?.numericValue
        ? Math.round(audits['largest-contentful-paint'].numericValue / 100) / 10
        : undefined;
      analysis.cls = audits['cumulative-layout-shift']?.numericValue
        ? Math.round(audits['cumulative-layout-shift'].numericValue * 1000) / 1000
        : undefined;
      analysis.fid = audits['max-potential-fid']?.numericValue
        ? Math.round(audits['max-potential-fid'].numericValue)
        : undefined;
    }
  } catch (err) {
    analysis.error = (err as Error).message.slice(0, 200);
  }

  return analysis;
}

function classify(lead: Place, analysis?: WebAnalysis): EnrichedLead['clasificacion'] {
  if (!lead.websiteUri) return 'SIN_WEB';
  if (!analysis) return 'WEB_SIN_ANALIZAR';
  if (!analysis.reachable) return 'WEB_INALCANZABLE';
  const score = analysis.pagespeedMobile ?? 100;
  if (score < 50) return 'WEB_MALA';
  if (score < 80) return 'WEB_REGULAR';
  return 'WEB_OK';
}

// Pool de concurrencia simple
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;

  async function next(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      done++;
      onProgress?.(done, items.length);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log(`🔎 Scan PYMES para ervok`);
  console.log(`   Sectores: ${SECTORES.join(', ')}`);
  console.log(`   Ciudades: ${CIUDADES.join(', ')}`);
  console.log(`   Total queries Places: ${SECTORES.length * CIUDADES.length}`);
  console.log(`   PageSpeed: ${skipPagespeed ? 'NO' : 'SÍ'} (concurrencia ${concurrency})\n`);

  // === 1) Places scan ===
  const byId = new Map<string, EnrichedLead>();
  let placesCalls = 0;
  const t0 = Date.now();

  for (const sector of SECTORES) {
    for (const ciudad of CIUDADES) {
      const q = `${sector} ${ciudad}`;
      process.stdout.write(`  Places: ${q.padEnd(48)} `);
      try {
        const { places, calls } = await scanQuery(q);
        placesCalls += calls;
        let nuevos = 0;
        for (const p of places) {
          if (byId.has(p.id)) continue;
          byId.set(p.id, {
            ...p,
            sectorBusqueda: sector,
            ciudadBusqueda: ciudad,
            clasificacion: classify(p),
          });
          nuevos++;
        }
        console.log(`→ ${places.length} (${nuevos} nuevos)`);
      } catch (err) {
        console.log(`❌ ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const leads = Array.from(byId.values());
  const conWeb = leads.filter((l) => l.websiteUri);
  const sinWeb = leads.filter((l) => !l.websiteUri);

  console.log(`\n📊 Places scan:`);
  console.log(`   Tiempo:        ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`   Calls:         ${placesCalls}  (≈ $${(placesCalls * 32 / 1000).toFixed(2)})`);
  console.log(`   Negocios:      ${leads.length}`);
  console.log(`   Con web:       ${conWeb.length}`);
  console.log(`   Sin web:       ${sinWeb.length}  ← leads inmediatos\n`);

  // === 2) PageSpeed analysis ===
  if (!skipPagespeed && conWeb.length > 0) {
    const toAnalyze = maxPagespeed ? conWeb.slice(0, maxPagespeed) : conWeb;
    console.log(`🔬 Analizando ${toAnalyze.length} webs con PageSpeed Insights (concurrencia ${concurrency})...`);
    const t1 = Date.now();

    await runWithConcurrency(
      toAnalyze,
      concurrency,
      async (lead) => {
        const analysis = await analyzeWebsite(lead.websiteUri!);
        const stored = byId.get(lead.id)!;
        stored.webAnalysis = analysis;
        stored.clasificacion = classify(stored, analysis);
        return analysis;
      },
      (done, total) => {
        process.stdout.write(`  ${done}/${total}\r`);
      }
    );
    console.log(`\n  Tiempo análisis: ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  }

  // === 3) Stats ===
  const finalLeads = Array.from(byId.values());
  const por: Record<string, number> = {};
  for (const l of finalLeads) por[l.clasificacion] = (por[l.clasificacion] || 0) + 1;

  console.log(`\n📊 Resumen final:`);
  console.log(`   Total leads:        ${finalLeads.length}`);
  console.log(`   SIN_WEB:            ${por['SIN_WEB'] || 0}    🔥 lead ALTA "te hacemos una"`);
  console.log(`   WEB_MALA:           ${por['WEB_MALA'] || 0}    🔥 lead ALTA "te rehacemos la web"`);
  console.log(`   WEB_REGULAR:        ${por['WEB_REGULAR'] || 0}    ⚖️  lead MEDIA "mejoras de performance"`);
  console.log(`   WEB_OK:             ${por['WEB_OK'] || 0}    🟢 lead BAJA "poco potencial"`);
  console.log(`   WEB_INALCANZABLE:   ${por['WEB_INALCANZABLE'] || 0}    ⚠️  web caída/timeout`);
  console.log(`   WEB_SIN_ANALIZAR:   ${por['WEB_SIN_ANALIZAR'] || 0}    ⏸  tienen web pero no se analizó (--skip-pagespeed)`);

  // Por sector
  console.log(`\n   Por sector:`);
  const porSector: Record<string, Record<string, number>> = {};
  for (const l of finalLeads) {
    if (!porSector[l.sectorBusqueda]) porSector[l.sectorBusqueda] = { SIN_WEB: 0, WEB_MALA: 0, total: 0 };
    porSector[l.sectorBusqueda][l.clasificacion] = (porSector[l.sectorBusqueda][l.clasificacion] || 0) + 1;
    porSector[l.sectorBusqueda].total++;
  }
  for (const [s, stats] of Object.entries(porSector)) {
    console.log(`     ${s.padEnd(20)} total=${stats.total}  SIN_WEB=${stats.SIN_WEB || 0}  WEB_MALA=${stats.WEB_MALA || 0}`);
  }

  // Top 10 oportunidades (SIN_WEB con rating alto = más establecidos)
  const oportunidades = finalLeads
    .filter((l) => l.clasificacion === 'SIN_WEB' || l.clasificacion === 'WEB_MALA')
    .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

  if (oportunidades.length) {
    console.log(`\n   🎯 Top 10 oportunidades (más reseñas → más establecidos):`);
    for (const l of oportunidades.slice(0, 10)) {
      const tag = l.clasificacion === 'SIN_WEB' ? '[SIN_WEB ]' : `[WEB_MALA score=${l.webAnalysis?.pagespeedMobile}]`;
      const tel = l.nationalPhoneNumber || l.internationalPhoneNumber || '(sin tel)';
      console.log(`     ${tag} ${(l.displayName?.text || '').slice(0, 40).padEnd(40)} | ${l.rating}⭐ (${l.userRatingCount}) | ${tel} | ${l.ciudadBusqueda}`);
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `leads-pymes-ervok-${ts}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        sectores: SECTORES,
        ciudades: CIUDADES,
        totalLeads: finalLeads.length,
        placesCalls,
        estimatedPlacesCost: `$${(placesCalls * 32 / 1000).toFixed(2)}`,
        timestamp: new Date().toISOString(),
        leads: finalLeads,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Guardado en: ${outFile}`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
