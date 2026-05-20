/**
 * Exporta todos los leads de los 4 SaaS Atleevo* a 4 ficheros CSV (uno por software).
 * Incluye también un fichero resumen con conteos por estado.
 *
 * Uso: npx tsx scripts/export-atleevo-leads.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const SOFTWARES = ['atleevo', 'atleevogym', 'atleevoyoga', 'atleevobox'];

const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');

const CSV_HEADERS = [
  'id',
  'nombre',
  'email',
  'telefono',
  'empresa',
  'cargo',
  'pais',
  'origen',
  'softwareId',
  'estado',
  'prioridad',
  'asignadoA',
  'ultimoContacto',
  'createdAt',
  'updatedAt',
  'web',
  'direccion',
  'ciudad',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'primaryType',
  'businessStatus',
  'notas',
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function metaString(meta: unknown, key: string): string {
  if (!meta || typeof meta !== 'object') return '';
  const v = (meta as Record<string, unknown>)[key];
  return v === undefined || v === null ? '' : String(v);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const summary: Record<string, { total: number; porEstado: Record<string, number>; conEmail: number; conWeb: number }> = {};

  for (const software of SOFTWARES) {
    const leads = await prisma.lead.findMany({
      where: { softwareId: software },
      orderBy: { createdAt: 'asc' },
    });

    const lines: string[] = [];
    lines.push(CSV_HEADERS.join(','));

    let conEmail = 0;
    let conWeb = 0;
    const porEstado: Record<string, number> = {};

    for (const lead of leads) {
      if (lead.email) conEmail++;
      const web = metaString(lead.metadata, 'websiteUri') || metaString(lead.metadata, 'web');
      if (web) conWeb++;
      porEstado[lead.estado] = (porEstado[lead.estado] ?? 0) + 1;

      const row = [
        lead.id,
        lead.nombre,
        lead.email,
        lead.telefono,
        lead.empresa,
        lead.cargo,
        lead.pais,
        lead.origen,
        lead.softwareId,
        lead.estado,
        lead.prioridad,
        lead.asignadoA,
        lead.ultimoContacto,
        lead.createdAt,
        lead.updatedAt,
        web,
        metaString(lead.metadata, 'formattedAddress') || metaString(lead.metadata, 'direccion'),
        metaString(lead.metadata, 'ciudad') || metaString(lead.metadata, 'city'),
        metaString(lead.metadata, 'rating'),
        metaString(lead.metadata, 'userRatingCount'),
        metaString(lead.metadata, 'googleMapsUri'),
        metaString(lead.metadata, 'primaryType') || metaString(lead.metadata, 'primaryTypeDisplayName'),
        metaString(lead.metadata, 'businessStatus'),
        lead.notas,
      ].map(csvEscape).join(',');
      lines.push(row);
    }

    const outFile = join(OUT_DIR, `${software}.csv`);
    writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');

    summary[software] = {
      total: leads.length,
      porEstado,
      conEmail,
      conWeb,
    };

    console.log(`OK  ${software.padEnd(12)} ${leads.length.toString().padStart(5)} leads  ->  ${outFile}`);
  }

  const summaryFile = join(OUT_DIR, '_summary.json');
  writeFileSync(summaryFile, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`\nResumen guardado en: ${summaryFile}`);
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
