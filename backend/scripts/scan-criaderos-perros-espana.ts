/**
 * Scan de criaderos de perros en España vía Google Places API (New).
 *
 * Combina 2 estrategias:
 *   A) "criadero perros {provincia/ciudad}" en 50 capitales españolas → criaderos locales
 *   B) "criadero {raza} España" para 12 razas más populares → criaderos especializados
 *
 * Filtra automáticamente refugios, protectoras, asociaciones, perreras, fundaciones, ONGs.
 * NO toca la BD. Guarda resultado en scripts/output/criaderos-perros-espana-{ts}.json
 *
 * Uso:
 *   npx ts-node scripts/scan-criaderos-perros-espana.ts
 *   npx ts-node scripts/scan-criaderos-perros-espana.ts --queries=10   # test
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

// === Estrategia A: por ciudad ===
const CIUDADES = [
  'Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla',
  'Huesca', 'Teruel', 'Zaragoza', 'Oviedo', 'Palma de Mallorca',
  'Las Palmas de Gran Canaria', 'Santa Cruz de Tenerife', 'Santander',
  'Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo',
  'Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora',
  'Barcelona', 'Girona', 'Lleida', 'Tarragona',
  'Badajoz', 'Cáceres',
  'A Coruña', 'Lugo', 'Ourense', 'Pontevedra',
  'Madrid', 'Murcia', 'Pamplona',
  'Bilbao', 'San Sebastián', 'Vitoria',
  'Logroño', 'Alicante', 'Castellón', 'Valencia',
];

// === Estrategia B: por raza ===
// Las 12 razas más buscadas/criadas profesionalmente en España
const RAZAS_TOP = [
  'Bulldog Francés',
  'Yorkshire Terrier',
  'Pastor Alemán',
  'Labrador Retriever',
  'Golden Retriever',
  'Chihuahua',
  'Pomerania',
  'Husky Siberiano',
  'Border Collie',
  'Caniche',
  'Maltés',
  'Mastín Español',
];

// === Blacklist: tipos de organización que NO son criaderos profesionales ===
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
  estrategia: 'ciudad' | 'raza';
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

async function main() {
  // Construir lista de queries
  const queries: { q: string; ciudad: string; estrategia: 'ciudad' | 'raza'; raza?: string }[] = [];
  for (const c of CIUDADES) {
    queries.push({ q: `criadero perros ${c}`, ciudad: c, estrategia: 'ciudad' });
  }
  for (const r of RAZAS_TOP) {
    queries.push({ q: `criadero ${r} España`, ciudad: 'España', estrategia: 'raza', raza: r });
  }
  const selected = maxQueries ? queries.slice(0, maxQueries) : queries;

  console.log(`🔎 Scan de criaderos en España`);
  console.log(`   Estrategia A (por ciudad): ${CIUDADES.length} queries`);
  console.log(`   Estrategia B (por raza):   ${RAZAS_TOP.length} queries`);
  console.log(`   Total queries: ${selected.length}\n`);

  const byId = new Map<string, EnrichedPlace>();
  let totalCalls = 0;
  let totalShelterFlagged = 0;
  const startedAt = Date.now();

  for (let i = 0; i < selected.length; i++) {
    const { q, ciudad, estrategia, raza } = selected[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(3)}/${selected.length}] ${q.padEnd(50)} `);
    try {
      const { all, calls } = await scanQuery(q);
      totalCalls += calls;
      let nuevos = 0;
      let flaggedAqui = 0;
      for (const p of all) {
        if (byId.has(p.id)) continue;
        const nombre = p.displayName?.text || '';
        const shelter = isShelter(nombre, p.types);
        if (shelter) {
          flaggedAqui++;
          totalShelterFlagged++;
        }
        byId.set(p.id, {
          ...p,
          ciudadBusqueda: ciudad,
          queryUsed: q,
          razaBusqueda: raza,
          estrategia,
          flaggedAsShelter: shelter,
        });
        nuevos++;
      }
      console.log(`→ ${all.length.toString().padStart(2)} (${nuevos} nuevos, ${flaggedAqui} refugio)`);
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const all = Array.from(byId.values());
  const profesionales = all.filter((p) => !p.flaggedAsShelter);

  const conTelefono = profesionales.filter((p) => p.nationalPhoneNumber || p.internationalPhoneNumber).length;
  const conWeb = profesionales.filter((p) => p.websiteUri).length;
  const conRating = profesionales.filter((p) => p.rating !== undefined).length;
  const operational = profesionales.filter((p) => !p.businessStatus || p.businessStatus === 'OPERATIONAL').length;
  const cost = (totalCalls * 32) / 1000;

  console.log(`\n📊 Resumen del scan:`);
  console.log(`   Tiempo:                  ${elapsed}s`);
  console.log(`   Calls Places API:        ${totalCalls}  (≈ $${cost.toFixed(2)})`);
  console.log(`   Negocios únicos:         ${all.length}`);
  console.log(`   Refugios/protectoras:    ${totalShelterFlagged}  (filtrados)`);
  console.log(`   CRIADEROS profesionales: ${profesionales.length}`);
  if (profesionales.length) {
    console.log(`     Con teléfono:          ${conTelefono} (${((conTelefono / profesionales.length) * 100).toFixed(0)}%)`);
    console.log(`     Con web:               ${conWeb} (${((conWeb / profesionales.length) * 100).toFixed(0)}%)`);
    console.log(`     Con rating:            ${conRating} (${((conRating / profesionales.length) * 100).toFixed(0)}%)`);
    console.log(`     En activo:             ${operational} (${((operational / profesionales.length) * 100).toFixed(0)}%)`);
  }

  // Breakdown por raza (estrategia B)
  const porRaza: Record<string, number> = {};
  for (const p of profesionales) {
    if (p.estrategia === 'raza' && p.razaBusqueda) {
      porRaza[p.razaBusqueda] = (porRaza[p.razaBusqueda] || 0) + 1;
    }
  }
  if (Object.keys(porRaza).length) {
    console.log(`\n   Por raza (estrategia B):`);
    for (const [r, n] of Object.entries(porRaza).sort((a, b) => b[1] - a[1])) {
      console.log(`     ${r.padEnd(20)} ${n}`);
    }
  }

  // Guardar
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `criaderos-perros-espana-${ts}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        totalPlaces: all.length,
        criaderosProfesionales: profesionales.length,
        sheltersFiltered: totalShelterFlagged,
        apiCalls: totalCalls,
        estimatedCost: `$${cost.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        places: all,
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
