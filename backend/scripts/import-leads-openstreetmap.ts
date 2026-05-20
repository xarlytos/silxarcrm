/**
 * Importa leads desde datos de OpenStreetMap (Overpass API).
 *
 * Uso:
 *   npx ts-node scripts/import-leads-openstreetmap.ts --software=peluguau --file=scripts/output/peluquerias-osm-nuevas-peluguau.json
 *
 * Flags:
 *   --software=ID     (req) softwareId al que asignar los leads
 *   --file=PATH       (opt) ruta al JSON de OSM (default: scripts/output/peluquerias-osm-nuevas-peluguau.json)
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

const filePath = String(
  flags.file || path.join(__dirname, 'output', 'peluquerias-osm-nuevas-peluguau.json')
);
const dryRun = Boolean(flags['dry-run']);
const pais = String(flags.pais || 'España');
const origen = 'openstreetmap';

const priorityRaw = String(flags.priority || 'MEDIA').toUpperCase();
const validPriorities: PrioridadLead[] = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as PrioridadLead[];
const prioridad: PrioridadLead = validPriorities.includes(priorityRaw as PrioridadLead)
  ? (priorityRaw as PrioridadLead)
  : ('MEDIA' as PrioridadLead);

// ---------- Leer JSON ----------
interface OsmLead {
  name: string;
  lat?: number;
  lon?: number;
  city?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  osm_id: number;
  osm_type: string;
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ No existe el archivo: ${filePath}`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OsmLead[];
const leads = raw.filter((l) => l.name && l.name.trim().length > 0);

console.log(`📊 Leads en JSON: ${raw.length} | Con nombre válido: ${leads.length}`);
console.log(`   Software: ${softwareId} | Origen: ${origen} | Dry-run: ${dryRun}\n`);

// ---------- Importar ----------
async function main() {
  let creados = 0;
  let saltados = 0;
  let sinNombre = 0;

  for (const l of leads) {
    const nombre = l.name.trim();

    // Deduplicar por (nombre, softwareId) — relajado
    const existing = await prisma.lead.findFirst({
      where: { nombre, softwareId },
    });
    if (existing) {
      saltados++;
      continue;
    }

    const telefono = l.phone || null;
    const direccion = [l.street, l.housenumber, l.postcode, l.city]
      .filter(Boolean)
      .join(', ');

    const notas = [
      'Importado desde OpenStreetMap',
      direccion && `Dirección: ${direccion}`,
      l.website && `Web: ${l.website}`,
      l.opening_hours && `Horario: ${l.opening_hours}`,
      l.lat && l.lon && `Coordenadas: ${l.lat}, ${l.lon}`,
    ]
      .filter(Boolean)
      .join('\n');

    if (dryRun) {
      console.log(`  🧪 ${nombre} | ${l.city || '—'} | 📞 ${telefono || '—'}`);
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
          osmId: l.osm_id,
          osmType: l.osm_type,
          lat: l.lat,
          lon: l.lon,
          city: l.city,
          street: l.street,
          housenumber: l.housenumber,
          postcode: l.postcode,
          website: l.website,
          openingHours: l.opening_hours,
        },
      },
    });
    creados++;
  }

  console.log(`\n✅ Importación completada:`);
  console.log(`   Creados: ${creados}`);
  console.log(`   Saltados (ya existían): ${saltados}`);
  console.log(`   Sin nombre: ${sinNombre}`);
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
