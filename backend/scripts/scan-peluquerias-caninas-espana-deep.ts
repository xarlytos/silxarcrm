/**
 * Scan profundo de peluquerías caninas en España (continuación del scan v1).
 *
 * - Subdivide grandes ciudades por distritos/zonas (Madrid, Barcelona, Valencia, Málaga, Sevilla, Murcia, Zaragoza, Las Palmas, Tenerife, Palma, Alicante, Tarragona, Vigo, Marbella).
 * - Añade ~90 ciudades medianas que no estaban en v1.
 * - Carga automáticamente todos los scans previos en scripts/output/peluquerias-caninas-espana-*.json
 *   para deduplicar por googlePlaceId y no malgastar calls.
 * - Expande field mask: addressComponents (calle/provincia/CP) + editorialSummary (descripción Google).
 * - Genera 2 ficheros:
 *     - peluquerias-caninas-espana-deep-{ts}.json   (solo nuevos)
 *     - peluquerias-caninas-espana-MASTER-{ts}.json (consolidado v1 + v2)
 *
 * Uso:
 *   npx ts-node scripts/scan-peluquerias-caninas-espana-deep.ts
 *   npx ts-node scripts/scan-peluquerias-caninas-espana-deep.ts --areas=10   # test con 10 áreas
 *   npx ts-node scripts/scan-peluquerias-caninas-espana-deep.ts --query="peluquería perros"
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
const maxAreas = flags.areas ? parseInt(String(flags.areas), 10) : undefined;
const queryTerm = String(flags.query || 'peluquería canina');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('❌ Falta GOOGLE_PLACES_API_KEY en .env');
  process.exit(1);
}

// ---------- Áreas ----------
// Subdivisión de grandes ciudades por distritos / zonas + ciudades medianas
const AREAS: string[] = [
  // === Madrid distritos (21) ===
  'Madrid Centro', 'Arganzuela Madrid', 'Retiro Madrid', 'Salamanca Madrid',
  'Chamartín Madrid', 'Tetuán Madrid', 'Chamberí Madrid', 'Fuencarral Madrid',
  'Moncloa-Aravaca Madrid', 'Latina Madrid', 'Carabanchel Madrid', 'Usera Madrid',
  'Puente de Vallecas Madrid', 'Moratalaz Madrid', 'Ciudad Lineal Madrid',
  'Hortaleza Madrid', 'Villaverde Madrid', 'Villa de Vallecas Madrid',
  'Vicálvaro Madrid', 'San Blas Madrid', 'Barajas Madrid',
  // === Barcelona distritos (10) ===
  'Ciutat Vella Barcelona', 'Eixample Barcelona', 'Sants-Montjuïc Barcelona',
  'Les Corts Barcelona', 'Sarrià-Sant Gervasi Barcelona', 'Gràcia Barcelona',
  'Horta-Guinardó Barcelona', 'Nou Barris Barcelona', 'Sant Andreu Barcelona',
  'Sant Martí Barcelona',
  // === Valencia distritos ===
  'Ciutat Vella Valencia', 'Eixample Valencia', 'Russafa Valencia',
  'Benimaclet Valencia', 'Patraix Valencia', 'Campanar Valencia',
  'Algirós Valencia', 'Quatre Carreres Valencia',
  // === Málaga zonas ===
  'Málaga Centro', 'Málaga Este', 'Teatinos Málaga', 'Pedregalejo Málaga',
  'Carretera de Cádiz Málaga',
  // === Sevilla zonas ===
  'Sevilla Centro', 'Triana Sevilla', 'Nervión Sevilla', 'Macarena Sevilla',
  'Los Remedios Sevilla',
  // === Murcia zonas ===
  'Murcia Centro', 'Espinardo Murcia', 'Puente Tocinos Murcia',
  // === Zaragoza zonas ===
  'Zaragoza Centro', 'Delicias Zaragoza', 'Actur Zaragoza',
  'Las Fuentes Zaragoza', 'San José Zaragoza',
  // === Las Palmas zonas ===
  'Las Palmas Centro', 'Vegueta Las Palmas', 'Triana Las Palmas',
  // === Tenerife zonas ===
  'Santa Cruz Centro Tenerife', 'La Laguna Tenerife', 'La Orotava',
  'Adeje', 'Arona Tenerife',
  // === Palma zonas ===
  'Palma Centro', 'El Terreno Palma', 'Génova Palma',
  // === Alicante zonas ===
  'Alicante Centro', 'San Juan Alicante', 'El Campello',
  // === Tarragona zonas ===
  'Tarragona Centro', 'Bonavista Tarragona',

  // === Madrid metropolitana (ciudades) ===
  'Alcobendas', 'Pozuelo de Alarcón', 'Las Rozas de Madrid', 'Majadahonda',
  'Boadilla del Monte', 'Coslada', 'Torrejón de Ardoz', 'Parla', 'Pinto',
  'Valdemoro', 'Aranjuez', 'Rivas-Vaciamadrid', 'Arganda del Rey',
  'San Sebastián de los Reyes', 'Tres Cantos', 'Collado Villalba',

  // === Cataluña ===
  'Mollet del Vallès', 'Sant Cugat del Vallès', 'Vilanova i la Geltrú',
  'Sitges', 'Castelldefels', 'Cornellà de Llobregat', 'Sant Boi de Llobregat',
  'Vilafranca del Penedès', 'Igualada', 'Vic', 'Olot', 'Lloret de Mar',
  'Cambrils', 'Salou', 'Manresa', 'Granollers', 'Tortosa',

  // === Comunidad Valenciana ===
  'Benidorm', 'Torrevieja', 'Orihuela', 'Denia', 'Alcoy', 'Gandía',
  'Sagunto', 'Paterna', 'Mislata', 'Torrent',

  // === Andalucía ===
  'Vélez-Málaga', 'Estepona', 'Fuengirola', 'Mijas', 'Torremolinos',
  'Benalmádena', 'Roquetas de Mar', 'El Ejido', 'Motril', 'Lucena',
  'Antequera', 'Sanlúcar de Barrameda', 'Chiclana de la Frontera',
  'San Fernando Cádiz', 'El Puerto de Santa María', 'Utrera', 'Linares',

  // === Murcia ===
  'Lorca', 'Caravaca de la Cruz', 'Yecla', 'Jumilla', 'Águilas',
  'Mazarrón', 'Cieza',

  // === Castilla-La Mancha ===
  'Talavera de la Reina', 'Tomelloso', 'Puertollano', 'Manzanares Ciudad Real',

  // === Extremadura ===
  'Mérida Badajoz', 'Plasencia', 'Don Benito',

  // === Asturias / Cantabria ===
  'Avilés', 'Mieres Asturias', 'Langreo', 'Torrelavega', 'Castro-Urdiales',

  // === País Vasco / Navarra / La Rioja ===
  'Eibar', 'Errenteria', 'Barakaldo', 'Getxo', 'Portugalete',
  'Sestao', 'Basauri', 'Durango Vizcaya', 'Irun',
  'Tudela', 'Estella Navarra', 'Barañáin',
  'Calahorra', 'Haro La Rioja',

  // === Galicia ===
  'Ferrol', 'Santiago de Compostela', 'Carballo', 'Vilagarcía de Arousa',
  'Lalín', 'Narón',

  // === Canarias ===
  'Telde', 'Arrecife', 'Puerto del Rosario', 'Maspalomas', 'Mogán',
  'Tías Lanzarote',

  // === Baleares ===
  'Manacor', 'Inca Mallorca', 'Mahón', 'Ibiza', 'Santa Eulària des Riu',
];

// ---------- Field mask ampliado ----------
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
}

// ---------- Dedupe: cargar todos los scans previos ----------
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
    } catch {
      // ignorar ficheros corruptos
    }
  }
  return { ids, previousPlaces };
}

// ---------- Places API ----------
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

async function scanArea(area: string): Promise<{ all: Place[]; calls: number }> {
  const all: Place[] = [];
  let pageToken: string | undefined;
  let calls = 0;
  for (let page = 0; page < 3; page++) {
    const response = await searchText(`${queryTerm} ${area}`, 20, pageToken);
    calls++;
    const batch = response.places || [];
    all.push(...batch);
    if (!response.nextPageToken || batch.length === 0) break;
    pageToken = response.nextPageToken;
    await new Promise((r) => setTimeout(r, 300));
  }
  return { all, calls };
}

// ---------- Main ----------
async function main() {
  const areas = maxAreas ? AREAS.slice(0, maxAreas) : AREAS;
  console.log(`🔎 Scan PROFUNDO de "${queryTerm}" en ${areas.length} áreas\n`);

  const { ids: knownIds, previousPlaces } = loadKnownIds();
  console.log(`📂 IDs ya conocidos de scans previos: ${knownIds.size}\n`);

  const newPlaces = new Map<string, EnrichedPlace>();
  let totalCalls = 0;
  const startedAt = Date.now();

  for (let i = 0; i < areas.length; i++) {
    const area = areas[i];
    process.stdout.write(`  [${(i + 1).toString().padStart(3)}/${areas.length}] ${area.padEnd(34)} `);
    try {
      const { all, calls } = await scanArea(area);
      totalCalls += calls;
      let nuevos = 0;
      for (const p of all) {
        if (!knownIds.has(p.id) && !newPlaces.has(p.id)) {
          newPlaces.set(p.id, { ...p, ciudadBusqueda: area });
          nuevos++;
        }
      }
      console.log(`→ ${all.length.toString().padStart(2)} resultados (${nuevos} nuevos)`);
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const nuevos = Array.from(newPlaces.values());
  const all = [...previousPlaces, ...nuevos];

  // Stats nuevos
  const conTelefono = nuevos.filter((p) => p.nationalPhoneNumber || p.internationalPhoneNumber).length;
  const conWeb = nuevos.filter((p) => p.websiteUri).length;
  const conRating = nuevos.filter((p) => p.rating !== undefined).length;
  const conSummary = nuevos.filter((p) => p.editorialSummary?.text).length;
  const costEstimate = (totalCalls * 32) / 1000;

  console.log(`\n📊 Resumen del scan deep:`);
  console.log(`   Tiempo:               ${elapsed}s`);
  console.log(`   Calls a Places API:   ${totalCalls}  (≈ $${costEstimate.toFixed(2)})`);
  console.log(`   Negocios NUEVOS:      ${nuevos.length}`);
  if (nuevos.length) {
    console.log(`   Con teléfono:         ${conTelefono} (${((conTelefono / nuevos.length) * 100).toFixed(0)}%)`);
    console.log(`   Con web:              ${conWeb} (${((conWeb / nuevos.length) * 100).toFixed(0)}%)`);
    console.log(`   Con rating:           ${conRating} (${((conRating / nuevos.length) * 100).toFixed(0)}%)`);
    console.log(`   Con descripción:      ${conSummary} (${((conSummary / nuevos.length) * 100).toFixed(0)}%)`);
  }
  console.log(`\n   📦 Master total (v1 + v2): ${all.length}`);

  // Guardar
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const newOnlyFile = path.join(outDir, `peluquerias-caninas-espana-deep-${ts}.json`);
  fs.writeFileSync(
    newOnlyFile,
    JSON.stringify(
      {
        query: queryTerm,
        scannedAreas: areas.length,
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
        sources: ['scan v1 (capitales + grandes)', 'scan v2 deep (distritos + medianas)'],
        timestamp: new Date().toISOString(),
        places: all,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Nuevos guardados en:   ${newOnlyFile}`);
  console.log(`💾 Master consolidado en: ${masterFile}`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
