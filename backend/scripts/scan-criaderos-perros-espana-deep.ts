/**
 * Scan v2 (deep) de criaderos en España: amplía cobertura.
 *
 *   - +25 razas adicionales (Bóxer, Beagle, Shih Tzu, Cocker, Doberman, Akita...)
 *   - 5 términos alternativos: "cachorros pedigree", "kennel", "criador canino"...
 *   - Razas × ciudades grandes para capturar locales
 *
 * Carga automáticamente los scans previos para deduplicar.
 * Genera fichero solo-nuevos + master consolidado.
 *
 * Uso:
 *   npx ts-node scripts/scan-criaderos-perros-espana-deep.ts
 *   npx ts-node scripts/scan-criaderos-perros-espana-deep.ts --queries=10  # test
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
const maxQueries = flags.queries ? parseInt(String(flags.queries), 10) : undefined;

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

// 25 razas adicionales (las del scan v1 ya están)
const RAZAS_EXTRA = [
  'Bóxer', 'Beagle', 'Shih Tzu', 'Carlino', 'Pug', 'Cocker Spaniel',
  'Doberman', 'Akita Inu', 'Shiba Inu', 'Schnauzer', 'Dálmata',
  'Galgo Español', 'Podenco', 'Rottweiler', 'Cane Corso',
  'Bulldog Inglés', 'American Bully', 'Cavalier King Charles',
  'Bichón Frisé', 'Westie', 'Jack Russell Terrier', 'Teckel',
  'Bull Terrier', 'Setter Inglés', 'Dogo Argentino',
];

// 5 términos alternativos
const TERMINOS_ALT = [
  'cachorros pedigree España',
  'kennel canino España',
  'criador canino profesional España',
  'venta cachorros raza pura España',
  'cría canina España',
];

// Razas top × ciudades grandes (combinaciones extra)
const RAZAS_TOP_PARA_CIUDADES = [
  'Bulldog Francés', 'Yorkshire Terrier', 'Pastor Alemán', 'Labrador',
  'Golden Retriever', 'Chihuahua', 'Bóxer', 'Beagle',
];
const CIUDADES_GRANDES = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga'];

const SHELTER_KEYWORDS = [
  'refugio', 'protectora', 'asociacion', 'asociación', 'asoc.', 'asoc ',
  'rescate', 'rehabilitacion', 'rehabilitación', 'perrera', 'ong',
  'fundacion', 'fundación', 'santuario', 'sociedad protectora',
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
  'places.editorialSummary',
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
  editorialSummary?: { text: string };
}

interface EnrichedPlace extends Place {
  ciudadBusqueda: string;
  queryUsed: string;
  razaBusqueda?: string;
  estrategia: string;
  flaggedAsShelter?: boolean;
}

async function searchText(textQuery: string, pageSize: number, pageToken?: string) {
  const body: Record<string, unknown> = { textQuery, pageSize, languageCode: 'es', regionCode: 'ES' };
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

async function scanQuery(query: string): Promise<{ all: Place[]; calls: number }> {
  const all: Place[] = [];
  let pageToken: string | undefined;
  let calls = 0;
  for (let page = 0; page < 3; page++) {
    const response = await searchText(query, 20, pageToken);
    calls++;
    const batch = response.places || [];
    all.push(...batch);
    if (!response.nextPageToken || batch.length === 0) break;
    pageToken = response.nextPageToken;
    await new Promise((r) => setTimeout(r, 300));
  }
  return { all, calls };
}

function isShelter(nombre: string, types?: string[]): boolean {
  const lower = nombre.toLowerCase();
  if (SHELTER_KEYWORDS.some((k) => lower.includes(k))) return true;
  if (types?.includes('animal_shelter')) return true;
  return false;
}

function loadKnownIds(): { ids: Set<string>; previousPlaces: EnrichedPlace[] } {
  const outDir = path.join(__dirname, 'output');
  const ids = new Set<string>();
  const previousPlaces: EnrichedPlace[] = [];
  if (!fs.existsSync(outDir)) return { ids, previousPlaces };
  const files = fs.readdirSync(outDir).filter((f) => f.startsWith('criaderos-perros-espana-') && f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
      const places = (data.places || []) as EnrichedPlace[];
      for (const p of places) {
        if (p.id && !ids.has(p.id)) {
          ids.add(p.id);
          previousPlaces.push(p);
        }
      }
    } catch {}
  }
  return { ids, previousPlaces };
}

async function main() {
  const queries: { q: string; ciudad: string; raza?: string; estrategia: string }[] = [];

  // 25 razas extra a nivel España
  for (const r of RAZAS_EXTRA) {
    queries.push({ q: `criadero ${r} España`, ciudad: 'España', raza: r, estrategia: 'raza-extra' });
  }
  // Términos alternativos
  for (const t of TERMINOS_ALT) {
    queries.push({ q: t, ciudad: 'España', estrategia: 'termino-alt' });
  }
  // Razas top × ciudades grandes
  for (const r of RAZAS_TOP_PARA_CIUDADES) {
    for (const c of CIUDADES_GRANDES) {
      queries.push({ q: `criadero ${r} ${c}`, ciudad: c, raza: r, estrategia: 'raza-ciudad' });
    }
  }

  const selected = maxQueries ? queries.slice(0, maxQueries) : queries;

  console.log(`🔎 Scan v2 DEEP de criaderos`);
  console.log(`   Razas extra:         ${RAZAS_EXTRA.length} queries`);
  console.log(`   Términos alt:        ${TERMINOS_ALT.length} queries`);
  console.log(`   Razas × ciudades:    ${RAZAS_TOP_PARA_CIUDADES.length * CIUDADES_GRANDES.length} queries`);
  console.log(`   Total queries:       ${selected.length}\n`);

  const { ids: knownIds, previousPlaces } = loadKnownIds();
  console.log(`📂 IDs ya conocidos del scan v1: ${knownIds.size}\n`);

  const newPlaces = new Map<string, EnrichedPlace>();
  const newByStrategy: Record<string, number> = {};
  let totalCalls = 0;
  let totalShelters = 0;
  const startedAt = Date.now();

  for (let i = 0; i < selected.length; i++) {
    const { q, ciudad, raza, estrategia } = selected[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(3)}/${selected.length}] ${q.slice(0, 50).padEnd(50)} `);
    try {
      const { all, calls } = await scanQuery(q);
      totalCalls += calls;
      let nuevos = 0;
      for (const p of all) {
        if (knownIds.has(p.id) || newPlaces.has(p.id)) continue;
        const nombre = p.displayName?.text || '';
        const shelter = isShelter(nombre, p.types);
        if (shelter) totalShelters++;
        newPlaces.set(p.id, {
          ...p,
          ciudadBusqueda: ciudad,
          queryUsed: q,
          razaBusqueda: raza,
          estrategia,
          flaggedAsShelter: shelter,
        });
        nuevos++;
      }
      newByStrategy[estrategia] = (newByStrategy[estrategia] || 0) + nuevos;
      console.log(`→ ${all.length.toString().padStart(2)} (${nuevos} nuevos)`);
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const nuevos = Array.from(newPlaces.values());
  const all = [...previousPlaces, ...nuevos];
  const allProfesionales = all.filter((p) => !p.flaggedAsShelter);
  const cost = (totalCalls * 32) / 1000;

  console.log(`\n📊 Resumen scan v2 deep:`);
  console.log(`   Tiempo:               ${elapsed}s`);
  console.log(`   Calls Places API:     ${totalCalls}  (≈ $${cost.toFixed(2)})`);
  console.log(`   Negocios NUEVOS:      ${nuevos.length}`);
  console.log(`   De los cuales refugios filtrados: ${nuevos.filter((p) => p.flaggedAsShelter).length}`);
  console.log(`\n   Aporte nuevo por estrategia:`);
  for (const [s, n] of Object.entries(newByStrategy).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${s.padEnd(15)} ${n}`);
  }

  console.log(`\n   📦 Master total (v1 + v2): ${all.length}`);
  console.log(`   📦 CRIADEROS profesionales (sin refugios): ${allProfesionales.length}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const newOnlyFile = path.join(outDir, `criaderos-perros-espana-deep-${ts}.json`);
  fs.writeFileSync(
    newOnlyFile,
    JSON.stringify(
      {
        newPlaces: nuevos.length,
        apiCalls: totalCalls,
        estimatedCost: `$${cost.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        places: nuevos,
      },
      null,
      2
    )
  );

  const masterFile = path.join(outDir, `criaderos-perros-espana-MASTER-${ts}.json`);
  fs.writeFileSync(
    masterFile,
    JSON.stringify(
      {
        totalPlaces: all.length,
        sources: ['scan v1 capitales+razas', 'scan v2 deep razas extra+términos alt'],
        timestamp: new Date().toISOString(),
        places: all,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Nuevos: ${newOnlyFile}`);
  console.log(`💾 Master: ${masterFile}`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
