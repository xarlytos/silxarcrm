/**
 * Scan v3 — términos alternativos para capturar peluquerías caninas
 * que se anuncian con terminología distinta a "peluquería canina".
 *
 * Combina 4 queries × 25 ciudades top = 100 combinaciones.
 * Carga TODOS los scans previos (v1 + v2) para deduplicar y solo añadir nuevos.
 *
 * Uso:
 *   npx ts-node scripts/scan-peluquerias-caninas-espana-variants.ts
 *   npx ts-node scripts/scan-peluquerias-caninas-espana-variants.ts --combos=10  # test
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
const maxCombos = flags.combos ? parseInt(String(flags.combos), 10) : undefined;

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

const QUERIES = [
  'peluquería perros',
  'grooming canino',
  'estética canina',
  'spa canino',
];

const CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza',
  'Málaga', 'Murcia', 'Palma de Mallorca', 'Las Palmas de Gran Canaria',
  'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón',
  'A Coruña', 'Granada', 'Elche', 'Oviedo', 'Pamplona',
  'Santander', 'Marbella', 'Sant Cugat del Vallès', 'Pozuelo de Alarcón', 'Castelldefels',
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
  displayName?: { text: string; languageCode?: string };
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
  editorialSummary?: { text: string; languageCode?: string };
}

interface PlacesResponse {
  places?: Place[];
  nextPageToken?: string;
}

interface EnrichedPlace extends Place {
  ciudadBusqueda: string;
  queryUsed?: string;
}

function loadKnownIds(): { ids: Set<string>; previousPlaces: EnrichedPlace[] } {
  const outDir = path.join(__dirname, 'output');
  const ids = new Set<string>();
  const previousPlaces: EnrichedPlace[] = [];
  if (!fs.existsSync(outDir)) return { ids, previousPlaces };

  const files = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith('peluquerias-caninas-espana-') && f.endsWith('.json'));

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

async function searchText(
  textQuery: string,
  pageSize: number,
  pageToken?: string
): Promise<PlacesResponse> {
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

  return (await res.json()) as PlacesResponse;
}

async function scanQuery(query: string, area: string): Promise<{ all: Place[]; calls: number }> {
  const all: Place[] = [];
  let pageToken: string | undefined;
  let calls = 0;
  for (let page = 0; page < 3; page++) {
    const response = await searchText(`${query} ${area}`, 20, pageToken);
    calls++;
    const batch = response.places || [];
    all.push(...batch);
    if (!response.nextPageToken || batch.length === 0) break;
    pageToken = response.nextPageToken;
    await new Promise((r) => setTimeout(r, 250));
  }
  return { all, calls };
}

async function main() {
  // Generar todas las combinaciones query × city
  const combos: { query: string; city: string }[] = [];
  for (const q of QUERIES) for (const c of CITIES) combos.push({ query: q, city: c });
  const selected = maxCombos ? combos.slice(0, maxCombos) : combos;

  console.log(`🔎 Scan v3 — ${QUERIES.length} queries × ${CITIES.length} ciudades = ${combos.length} combinaciones`);
  console.log(`   Queries: ${QUERIES.map((q) => `"${q}"`).join(', ')}\n`);

  const { ids: knownIds, previousPlaces } = loadKnownIds();
  console.log(`📂 IDs ya conocidos: ${knownIds.size}\n`);

  const newPlaces = new Map<string, EnrichedPlace>();
  const newByQuery = new Map<string, number>();
  let totalCalls = 0;
  const startedAt = Date.now();

  for (let i = 0; i < selected.length; i++) {
    const { query, city } = selected[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(3)}/${selected.length}] "${query}" @ ${city.padEnd(28)} `);
    try {
      const { all, calls } = await scanQuery(query, city);
      totalCalls += calls;
      let nuevos = 0;
      for (const p of all) {
        if (!knownIds.has(p.id) && !newPlaces.has(p.id)) {
          newPlaces.set(p.id, { ...p, ciudadBusqueda: city, queryUsed: query });
          nuevos++;
        }
      }
      newByQuery.set(query, (newByQuery.get(query) || 0) + nuevos);
      console.log(`→ ${all.length.toString().padStart(2)} (${nuevos} nuevos)`);
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const nuevos = Array.from(newPlaces.values());
  const all = [...previousPlaces, ...nuevos];

  const conTelefono = nuevos.filter((p) => p.nationalPhoneNumber || p.internationalPhoneNumber).length;
  const conWeb = nuevos.filter((p) => p.websiteUri).length;
  const costEstimate = (totalCalls * 32) / 1000;

  console.log(`\n📊 Resumen del scan v3:`);
  console.log(`   Tiempo:               ${elapsed}s`);
  console.log(`   Calls a Places API:   ${totalCalls}  (≈ $${costEstimate.toFixed(2)})`);
  console.log(`   Negocios NUEVOS:      ${nuevos.length}`);
  if (nuevos.length) {
    console.log(`   Con teléfono:         ${conTelefono} (${((conTelefono / nuevos.length) * 100).toFixed(0)}%)`);
    console.log(`   Con web:              ${conWeb} (${((conWeb / nuevos.length) * 100).toFixed(0)}%)`);
  }
  console.log(`\n   Aporte por query:`);
  for (const q of QUERIES) {
    console.log(`     "${q}": ${newByQuery.get(q) || 0} nuevos`);
  }
  console.log(`\n   📦 Master total (v1 + v2 + v3): ${all.length}`);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const newOnlyFile = path.join(outDir, `peluquerias-caninas-espana-variants-${ts}.json`);
  fs.writeFileSync(
    newOnlyFile,
    JSON.stringify(
      {
        queries: QUERIES,
        cities: CITIES,
        newPlaces: nuevos.length,
        apiCalls: totalCalls,
        estimatedCost: `$${costEstimate.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        places: nuevos,
      },
      null,
      2
    )
  );

  const masterFile = path.join(outDir, `peluquerias-caninas-espana-MASTER-${ts}.json`);
  fs.writeFileSync(
    masterFile,
    JSON.stringify(
      {
        totalPlaces: all.length,
        sources: ['v1 capitales', 'v2 deep distritos+medianas', 'v3 queries alternativas'],
        timestamp: new Date().toISOString(),
        places: all,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Nuevos:  ${newOnlyFile}`);
  console.log(`💾 Master:  ${masterFile}`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
