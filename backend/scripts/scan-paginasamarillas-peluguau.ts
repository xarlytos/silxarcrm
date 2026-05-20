/**
 * Scraper de PaginasAmarillas.es para peluquerías caninas.
 *
 * Busca "peluqueria canina" en toda España, pagina por resultados,
 * extrae nombre, dirección, teléfono, ciudad y web.
 * Deduplica con leads existentes de Google Maps.
 * Guarda las nuevas en JSON para importar como leads.
 *
 * Uso:
 *   npx ts-node scripts/scan-paginasamarillas-peluguau.ts
 *   npx ts-node scripts/scan-paginasamarillas-peluguau.ts --max-pages=5
 *   npx ts-node scripts/scan-paginasamarillas-peluguau.ts --query=estetica+canina
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

// ---------- CLI ----------
const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}

const maxPages = flags['max-pages'] ? parseInt(String(flags['max-pages']), 10) : undefined;
const query = String(flags.query || 'peluqueria-canina');
const delayMs = 2000; // Respetar al servidor

// ---------- Interfaces ----------
interface PABusiness {
  nombre: string;
  telefono?: string;
  direccion?: string;
  calle?: string;
  ciudad?: string;
  codigoPostal?: string;
  categoria?: string;
  descripcion?: string;
  url?: string;
  pagina: number;
}

// ---------- Fetch con retry ----------
async function fetchPage(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Referer': 'https://www.paginasamarillas.es/',
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`    ⚠️  Reintento ${attempt}/${retries} para ${url}`);
      await sleep(delayMs * attempt);
    }
  }
  throw new Error('Unreachable');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Parsear una página ----------
function parsePage(html: string, pagina: number): PABusiness[] {
  const $ = cheerio.load(html);
  const items: PABusiness[] = [];

  $('.listado-item').each((_, el) => {
    const item = $(el);

    const nombre = item.find('span[itemprop="name"]').first().text().trim();
    if (!nombre) return;

    const telefono = item.find('span[itemprop="telephone"]').first().text().trim() || undefined;
    const direccion = item.find('span[itemprop="address"]').first().text().trim() || undefined;
    const calle = item.find('span[itemprop="streetAddress"]').first().text().trim() || undefined;
    const ciudad = item.find('span[itemprop="addressLocality"]').first().text().trim() || undefined;
    const codigoPostal = item.find('span[itemprop="postalCode"]').first().text().trim() || undefined;
    const categoria = item.find('.categ').first().text().trim() || undefined;
    const descripcion = item.find('div[itemprop="description"] p').first().text().trim() || undefined;
    const url = item.find('a[data-omniclick="name"]').attr('href') || undefined;

    items.push({
      nombre,
      telefono,
      direccion,
      calle,
      ciudad,
      codigoPostal,
      categoria,
      descripcion,
      url,
      pagina,
    });
  });

  return items;
}

// ---------- Deduplicar con Google Maps ----------
function deduplicate(paList: PABusiness[], gmPlaces: any[]): PABusiness[] {
  // Normalizar nombres
  function normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  const gmNames = new Set<string>();
  for (const p of gmPlaces) {
    const name = normalize(p.displayName?.text || '');
    if (name) gmNames.add(name);
  }

  const nuevas: PABusiness[] = [];
  const seenNames = new Set<string>();

  for (const b of paList) {
    const normName = normalize(b.nombre);

    // Skip si ya existe en Google Maps
    if (gmNames.has(normName)) continue;

    // Skip duplicados dentro del propio scrape
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);

    nuevas.push(b);
  }

  return nuevas;
}

// ---------- Main ----------
async function main() {
  console.log(`🔎 Scrape de PaginasAmarillas.es: "${query}"`);
  console.log(`   Max páginas: ${maxPages || 'ilimitado'}\n`);

  // Cargar datos existentes de Google Maps
  const gmFile = path.join(__dirname, 'output', 'peluquerias-caninas-espana-MASTER-2026-05-19T12-43-55.json');
  let gmPlaces: any[] = [];
  if (fs.existsSync(gmFile)) {
    const gmData = JSON.parse(fs.readFileSync(gmFile, 'utf-8'));
    gmPlaces = gmData.places || [];
    console.log(`📊 Datos Google Maps cargados: ${gmPlaces.length} peluquerías`);
  } else {
    console.log(`⚠️  No se encontró ${gmFile}, no se podrá deduplicar`);
  }

  const allItems: PABusiness[] = [];
  let page = 1;
  const baseUrl = `https://www.paginasamarillas.es/search/${query}/all-ma/all-pr/all-is/all-ci/all-ba/all-pu/all-nc`;

  while (true) {
    if (maxPages && page > maxPages) {
      console.log(`\n⏹️  Alcanzado max-pages=${maxPages}`);
      break;
    }

    const url = `${baseUrl}/${page}`;
    process.stdout.write(`  [Página ${page}] ${url} `);

    try {
      const html = await fetchPage(url);
      const items = parsePage(html, page);

      if (items.length === 0) {
        console.log('→ 0 resultados (fin)');
        break;
      }

      allItems.push(...items);
      console.log(`→ ${items.length} resultados (total: ${allItems.length})`);

      // Verificar si hay siguiente página
      const $ = cheerio.load(html);
      const hasNext = $('.paginacion a, .pagination a').toArray().some((el) => {
        const href = $(el).attr('href') || '';
        return href.includes(`/${page + 1}`);
      });
      if (!hasNext && page > 1) {
        console.log('\n⏹️  No hay más páginas');
        break;
      }
    } catch (err) {
      console.log(`❌ ${(err as Error).message}`);
      if ((err as Error).message.includes('404')) break;
    }

    await sleep(delayMs);
    page++;
  }

  // Deduplicar
  console.log(`\n📊 Deduplicando con Google Maps...`);
  const nuevas = deduplicate(allItems, gmPlaces);

  // Stats
  const conTelefono = nuevas.filter((b) => b.telefono).length;
  const conDireccion = nuevas.filter((b) => b.direccion).length;
  const conCiudad = nuevas.filter((b) => b.ciudad).length;

  console.log(`\n📊 Resumen:`);
  console.log(`   Total scrapeadas (PA):  ${allItems.length}`);
  console.log(`   Duplicadas (en GM):     ${allItems.length - nuevas.length}`);
  console.log(`   NUEVAS:                 ${nuevas.length}`);
  console.log(`   Con teléfono:           ${conTelefono} (${((conTelefono / nuevas.length) * 100).toFixed(0)}%)`);
  console.log(`   Con dirección:          ${conDireccion} (${((conDireccion / nuevas.length) * 100).toFixed(0)}%)`);
  console.log(`   Con ciudad:             ${conCiudad} (${((conCiudad / nuevas.length) * 100).toFixed(0)}%)`);

  // Guardar
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = path.join(outDir, `peluquerias-paginasamarillas-${query}-${ts}.json`);

  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        query,
        totalPagesScanned: page - 1,
        totalScraped: allItems.length,
        totalNew: nuevas.length,
        timestamp: new Date().toISOString(),
        businesses: nuevas,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Guardado en: ${outFile}`);

  // Muestra
  console.log(`\n--- Primeras 10 nuevas ---`);
  for (const b of nuevas.slice(0, 10)) {
    console.log(`  ${b.nombre} | ${b.ciudad || '—'} | 📞 ${b.telefono || '—'}`);
  }

  // También guardar lista de nombres para importación rápida
  const importFile = path.join(outDir, `peluquerias-paginasamarillas-${query}-IMPORT-${ts}.json`);
  fs.writeFileSync(importFile, JSON.stringify(nuevas, null, 2));
  console.log(`\n💾 Lista de importación: ${importFile}`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
