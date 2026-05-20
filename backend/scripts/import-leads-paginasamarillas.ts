/**
 * Importa leads desde datos de PaginasAmarillas.es.
 *
 * Uso:
 *   npx ts-node scripts/import-leads-paginasamarillas.ts --software=peluguau --file=scripts/output/peluquerias-paginasamarillas-peluqueria-canina-IMPORT-...
 *
 * Flags:
 *   --software=ID     (req) softwareId al que asignar los leads
 *   --file=PATH       (opt) ruta al JSON de importación
 *   --dry-run         (opt) no inserta, solo muestra
 *   --pais=...        (opt) default: "España"
 *   --priority=...    (opt) default: MEDIA
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient, LeadEstado, PrioridadLead } from '@prisma/client';

const prisma = new PrismaClient();

// ---------- CLI parsing ----------
const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}

const softwareId = String(flags.software || '');
if (!softwareId) {
  console.error('❌ Falta --software=<id>');
  process.exit(1);
}

// Buscar archivo más reciente si no se especifica
function findLatestImportFile(): string {
  const outDir = path.join(__dirname, 'output');
  const files = fs.readdirSync(outDir)
    .filter(f => f.startsWith('peluquerias-paginasamarillas') && f.includes('-IMPORT-'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(outDir, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (files.length === 0) {
    throw new Error('No se encontró ningún archivo de importación de PaginasAmarillas');
  }
  return path.join(outDir, files[0].name);
}

const filePath = String(flags.file || findLatestImportFile());
const dryRun = Boolean(flags['dry-run']);
const pais = String(flags.pais || 'España');
const origen = 'paginasamarillas';

const priorityRaw = String(flags.priority || 'MEDIA').toUpperCase();
const validPriorities: PrioridadLead[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as PrioridadLead[];
const prioridad: PrioridadLead = validPriorities.includes(priorityRaw as PrioridadLead)
  ? (priorityRaw as PrioridadLead)
  : ('MEDIA' as PrioridadLead);

// ---------- Leer JSON ----------
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

if (!fs.existsSync(filePath)) {
  console.error(`❌ No existe el archivo: ${filePath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PABusiness[];
const leads = raw.filter((l) => l.nombre && l.nombre.trim().length > 0);

console.log(`📊 Leads en JSON: ${raw.length} | Con nombre válido: ${leads.length}`);
console.log(`   Software: ${softwareId} | Origen: ${origen} | Dry-run: ${dryRun}\n`);

// ---------- Importar ----------
async function main() {
  let creados = 0;
  let saltados = 0;

  for (const l of leads) {
    const nombre = l.nombre.trim();

    // Deduplicar por (nombre, softwareId)
    const existing = await prisma.lead.findFirst({
      where: { nombre, softwareId },
    });
    if (existing) {
      saltados++;
      continue;
    }

    const telefono = l.telefono || null;
    const direccion = [l.calle, l.codigoPostal, l.ciudad]
      .filter(Boolean)
      .join(', ');

    const notas = [
      'Importado desde PaginasAmarillas.es',
      l.categoria && `Categoría: ${l.categoria}`,
      direccion && `Dirección: ${direccion}`,
      l.descripcion && `Descripción: ${l.descripcion}`,
      l.url && `Web: ${l.url}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (dryRun) {
      console.log(`  🧪 ${nombre} | ${l.ciudad || '—'} | 📞 ${telefono || '—'}`);
      continue;
    }

    await prisma.lead.create({
      data: {
        nombre,
        email: null,
        telefono,
        empresa: nombre,
        pais,
        origen,
        softwareId,
        estado: LeadEstado.NUEVO,
        prioridad,
        notas: notas || null,
        metadata: {
          paginasAmarillasUrl: l.url,
          ciudad: l.ciudad,
          calle: l.calle,
          codigoPostal: l.codigoPostal,
          direccion: l.direccion,
          categoria: l.categoria,
          descripcion: l.descripcion,
          paginaScrape: l.pagina,
        },
      },
    });
    creados++;
  }

  console.log(`\n✅ Importación completada:`);
  console.log(`   Creados: ${creados}`);
  console.log(`   Saltados (ya existían): ${saltados}`);
  if (dryRun) {
    console.log(`\n🧪 Dry-run: quita --dry-run para insertar en la BD.`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
