/**
 * Scan masivo de peluquerías caninas en España vía Google Places API (New).
 *
 * - Busca "peluquería canina {ciudad}" para todas las capitales de provincia + grandes ciudades.
 * - Pagina hasta el máximo de Google (60 resultados por búsqueda).
 * - Deduplica por googlePlaceId.
 * - Guarda el resultado en scripts/output/peluquerias-caninas-espana-{timestamp}.json
 * - NO toca la BD. Para importar después se hace en otro paso.
 *
 * Uso:
 *   npx ts-node scripts/scan-peluquerias-caninas-espana.ts
 *   npx ts-node scripts/scan-peluquerias-caninas-espana.ts --cities=5     # limita a 5 ciudades (test)
 *   npx ts-node scripts/scan-peluquerias-caninas-espana.ts --query="peluquería perros"
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// ---------- CLI ----------
const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}
const maxCities = flags.cities ? parseInt(String(flags.cities), 10) : undefined;
const queryTerm = String(flags.query || 'peluquería canina');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

// ---------- Ciudades ----------
// 50 capitales de provincia + 2 ciudades autónomas + 18 grandes ciudades no-capitales
const CIUDADES: string[] = [
  // Andalucía
  'Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla',
  // Aragón
  'Huesca', 'Teruel', 'Zaragoza',
  // Asturias
  'Oviedo',
  // Baleares
  'Palma de Mallorca',
  // Canarias
  'Las Palmas de Gran Canaria', 'Santa Cruz de Tenerife',
  // Cantabria
  'Santander',
  // Castilla-La Mancha
  'Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo',
  // Castilla y León
  'Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora',
  // Cataluña
  'Barcelona', 'Girona', 'Lleida', 'Tarragona',
  // Extremadura
  'Badajoz', 'Cáceres',
  // Galicia
  'A Coruña', 'Lugo', 'Ourense', 'Pontevedra',
  // Madrid
  'Madrid',
  // Murcia
  'Murcia',
  // Navarra
  'Pamplona',
  // País Vasco
  'Bilbao', 'San Sebastián', 'Vitoria',
  // La Rioja
  'Logroño',
  // Comunidad Valenciana
  'Alicante', 'Castellón de la Plana', 'Valencia',
  // Ciudades autónomas
  'Ceuta', 'Melilla',
  // Grandes ciudades no-capital
  'Vigo', 'Gijón', 'Hospitalet de Llobregat', 'Badalona', 'Terrassa', 'Sabadell', 'Mataró',
  'Elche', 'Cartagena', 'Jerez de la Frontera', 'Marbella', 'Algeciras', 'Dos Hermanas',
  'Móstoles', 'Fuenlabrada', 'Leganés', 'Getafe', 'Alcalá de Henares', 'Alcorcón',
];

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

interface EnrichedPlace extends Place {
  ciudadBusqueda: string;
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

async function scanCity(ciudad: string): Promise<Place[]> {
  const all: Place[] = [];
  let pageToken: string | undefined;
  // Places New permite hasta ~3 páginas (60 resultados) por query
  for (let page = 0; page < 3; page++) {
    const response = await searchText(`${queryTerm} ${ciudad}`, 20, pageToken);
    const batch = response.places || [];
    all.push(...batch);
    if (!response.nextPageToken || batch.length === 0) break;
    pageToken = response.nextPageToken;
    await new Promise((r) => setTimeout(r, 300));
  }
  return all;
}

async function main() {
  const cities = maxCities ? CIUDADES.slice(0, maxCities) : CIUDADES;
  console.log(`🔎 Scan de "${queryTerm}" en ${cities.length} ciudades de España\n`);

  const byId = new Map<string, EnrichedPlace>();
  let totalCalls = 0;
  const startedAt = Date.now();

  for (let i = 0; i < cities.length; i++) {
    const ciudad = cities[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(2)}/${cities.length}] ${ciudad.padEnd(30)} `);
    try {
      const places = await scanCity(ciudad);
      let nuevos = 0;
      for (const p of places) {
        if (!byId.has(p.id)) {
          byId.set(p.id, { ...p, ciudadBusqueda: ciudad });
          nuevos++;
        }
      }
      totalCalls += Math.min(3, Math.ceil(places.length / 20)) || 1;
      console.log(`→ ${places.length.toString().padStart(2)} resultados (${nuevos} nuevos)`);
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
    }
    // Pequeña pausa entre ciudades para no rascar quotas
    await new Promise((r) => setTimeout(r, 200));
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const all = Array.from(byId.values());

  // Stats
  const conTelefono = all.filter((p) => p.nationalPhoneNumber || p.internationalPhoneNumber).length;
  const conWeb = all.filter((p) => p.websiteUri).length;
  const conRating = all.filter((p) => p.rating !== undefined).length;
  const operational = all.filter((p) => !p.businessStatus || p.businessStatus === 'OPERATIONAL').length;
  const costEstimate = (totalCalls * 32) / 1000;

  console.log(`\n📊 Resumen del scan:`);
  console.log(`   Tiempo:               ${elapsed}s`);
  console.log(`   Calls a Places API:   ${totalCalls}  (≈ $${costEstimate.toFixed(2)})`);
  console.log(`   Negocios únicos:      ${all.length}`);
  console.log(`   Con teléfono:         ${conTelefono} (${((conTelefono / all.length) * 100).toFixed(0)}%)`);
  console.log(`   Con web:              ${conWeb} (${((conWeb / all.length) * 100).toFixed(0)}%)`);
  console.log(`   Con rating:           ${conRating} (${((conRating / all.length) * 100).toFixed(0)}%)`);
  console.log(`   En activo:            ${operational} (${((operational / all.length) * 100).toFixed(0)}%)`);

  // Guardar JSON
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `peluquerias-caninas-espana-${ts}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        query: queryTerm,
        scannedCities: cities.length,
        totalPlaces: all.length,
        apiCalls: totalCalls,
        estimatedCost: `$${costEstimate.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        places: all,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Guardado en: ${outFile}`);
  console.log(`   (Revisa el archivo. Cuando quieras importarlos a la BD, lo hacemos.)`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
