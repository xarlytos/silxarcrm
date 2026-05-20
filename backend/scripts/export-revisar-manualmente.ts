/**
 * Exporta los leads con etiqueta 'revisar-manualmente' a un CSV categorizado.
 * Asigna una categoría humana basada en primaryType + types[] + keywords del nombre.
 *
 * Uso: npx tsx scripts/export-revisar-manualmente.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');

function metaStr(meta: unknown, key: string): string {
  if (!meta || typeof meta !== 'object') return '';
  const v = (meta as Record<string, unknown>)[key];
  return v === undefined || v === null ? '' : String(v);
}
function metaArr(meta: unknown, key: string): string[] {
  if (!meta || typeof meta !== 'object') return [];
  const v = (meta as Record<string, unknown>)[key];
  return Array.isArray(v) ? v.map(String) : [];
}

function categorize(name: string, primaryType: string, types: string[]): string {
  const n = name.toLowerCase();
  // Categorías por nombre primero (más específicas)
  if (/nutric|dietist|food_store/.test(n + primaryType + types.join(','))) return 'nutricion';
  if (/fisio|physiotherapist|kinesi/.test(n + primaryType + types.join(','))) return 'fisioterapia';
  if (/cl[íi]nic|medical_clinic|doctor|hospital/.test(n + primaryType + types.join(','))) return 'clinica-medica';
  if (/escuela|academia|formaci|educational|opoefi|isad|cenet/.test(n + primaryType)) return 'escuela-formacion';
  if (/est[ée]tica|beautician|peluqu/.test(n + primaryType)) return 'estetica-belleza';
  if (/masaje|massage|spa\b/.test(n + primaryType)) return 'masaje-spa';
  if (/pilates|yoga/.test(n)) return 'pilates-yoga';
  if (/crossfit|\bbox\b/.test(n)) return 'crossfit-box';
  if (/gimnasio|\bgym\b|fitness/.test(n)) return 'gimnasio-fitness';
  // Fallback por primaryType
  switch (primaryType) {
    case 'wellness_center': return 'wellness-mixto';
    case 'sports_club': return 'club-deportivo';
    case 'sports_school': return 'escuela-deportiva';
    case 'sports_complex': return 'complejo-deportivo';
    case 'amusement_center': return 'amusement';
    case 'store': return 'tienda';
    case 'consultant': return 'consultor';
    default: return primaryType || 'sin-tipo';
  }
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const tag = await prisma.leadEtiqueta.findUnique({ where: { nombre: 'revisar-manualmente' } });
  if (!tag) {
    console.error('No existe la etiqueta revisar-manualmente');
    return;
  }
  const leads = await prisma.lead.findMany({
    where: { etiquetas: { some: { id: tag.id } } },
    orderBy: [{ softwareId: 'asc' }, { nombre: 'asc' }],
  });

  console.log(`Leads etiquetados 'revisar-manualmente': ${leads.length}\n`);

  const rows: { categoria: string; lead: typeof leads[number] }[] = [];
  const byCat: Record<string, number> = {};
  for (const l of leads) {
    const primaryType = metaStr(l.metadata, 'primaryType');
    const types = metaArr(l.metadata, 'types');
    const cat = categorize(l.nombre, primaryType, types);
    byCat[cat] = (byCat[cat] ?? 0) + 1;
    rows.push({ categoria: cat, lead: l });
  }
  rows.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.lead.nombre.localeCompare(b.lead.nombre));

  console.log('Resumen por categoría:');
  for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c.padEnd(22)} ${n}`);
  }

  const headers = [
    'categoria', 'softwareId', 'id', 'nombre', 'telefono', 'web',
    'primaryType', 'types', 'ciudad', 'direccion', 'rating', 'userRatingCount',
    'googleMapsUri', 'createdAt',
  ];
  const lines: string[] = [headers.join(',')];
  for (const r of rows) {
    const m = r.lead.metadata as any;
    lines.push([
      r.categoria,
      r.lead.softwareId,
      r.lead.id,
      r.lead.nombre,
      r.lead.telefono ?? '',
      metaStr(m, 'websiteUri'),
      metaStr(m, 'primaryType'),
      metaArr(m, 'types').slice(0, 5).join(';'),
      metaStr(m, 'ciudad'),
      metaStr(m, 'formattedAddress'),
      metaStr(m, 'rating'),
      metaStr(m, 'userRatingCount'),
      metaStr(m, 'googleMapsUri'),
      r.lead.createdAt.toISOString(),
    ].map(csvEscape).join(','));
  }

  const out = join(OUT_DIR, 'revisar-manualmente.csv');
  writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  console.log(`\nCSV: ${out}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
