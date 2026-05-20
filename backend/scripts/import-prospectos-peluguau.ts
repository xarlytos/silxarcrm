/**
 * Importa prospectos peluquerías caninas a la BD desde:
 *   groomlyproyecto/docs/prospectos-peluquerias-barcelona.md
 *   groomlyproyecto/docs/prospectos-peluquerias-valencia.md
 *
 * - Idempotente: usa nombre+softwareId+origen como clave para detectar duplicados.
 * - Email opcional (la mayoría no tiene email — se deja null).
 * - softwareId = "peluguau"
 * - origen = "prospeccion-bcn" | "prospeccion-vlc"
 * - Prioridad: ALTA si está en "mejores pistas", BAJA si tiene asterisco, MEDIA resto.
 *
 * Uso: npx ts-node scripts/import-prospectos-peluguau.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient, PrioridadLead, LeadEstado } from '@prisma/client';

const prisma = new PrismaClient();

const SOFTWARE_ID = 'peluguau';
const ROOT = path.resolve(__dirname, '../..');
const FILE_BCN = path.join(ROOT, 'groomlyproyecto/docs/prospectos-peluquerias-barcelona.md');
const FILE_VLC = path.join(ROOT, 'groomlyproyecto/docs/prospectos-peluquerias-valencia.md');

// "Mejores pistas accionables" identificadas en los .md → prioridad ALTA
const MEJORES_PISTAS = [
  'bub bub', 'sonia', 'exotics',
  'moixaines', 'spa ponlo xulo', 'peluts bdn', 'paws y cosy',
  'bondi',
  'dogsoul', 'villamascotas',
];

interface ParsedRow {
  nombre: string;
  direccion: string | null;
  municipio: string;
  telefono: string | null;
  valoracion: string | null;
  instagram: string | null;
  facebook: string | null;
  notas: string | null;
  asteriscado: boolean;
  grupo: 'A' | 'B';
}

function cleanCell(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s || s === '—' || s === '-' || /^\(no localizado\)$/i.test(s) || /^\(revisar\)$/i.test(s)) {
    return null;
  }
  return s;
}

function extractEmail(notas: string | null): string | null {
  if (!notas) return null;
  const m = notas.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

function isMejorPista(nombre: string): boolean {
  const lower = nombre.toLowerCase();
  return MEJORES_PISTAS.some(p => lower.includes(p));
}

function computePrioridad(nombre: string, asteriscado: boolean): PrioridadLead {
  if (isMejorPista(nombre)) return PrioridadLead.ALTA;
  if (asteriscado) return PrioridadLead.BAJA;
  return PrioridadLead.MEDIA;
}

/**
 * Parsea las tablas de tipo Grupo A (7 cols) o Grupo B (9 cols) de un .md.
 * Detecta los grupos por el encabezado `## Grupo A` / `## Grupo B`.
 */
function parseMarkdown(file: string): ParsedRow[] {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let currentGroup: 'A' | 'B' | null = null;
  let inApendice = false;

  for (const line of lines) {
    // Detección de secciones
    if (/^##\s+Grupo A\b/i.test(line)) { currentGroup = 'A'; inApendice = false; continue; }
    if (/^##\s+Grupo B\b/i.test(line)) { currentGroup = 'B'; inApendice = false; continue; }
    if (/^##\s+Ap[eé]ndice\b/i.test(line) || /^##\s+Resumen\b/i.test(line)) {
      currentGroup = null;
      inApendice = /Ap[eé]ndice/i.test(line);
      continue;
    }

    if (!currentGroup || inApendice) continue;
    if (!line.trim().startsWith('|')) continue;

    // Saltar encabezado y separador
    if (/^\|\s*#\s*\|/.test(line)) continue;
    if (/^\|[-:\s|]+\|$/.test(line)) continue;

    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length === 0) continue;

    // Grupo A: # | Nombre | Dirección | Municipio | Teléfono | Valoración | Notas
    // Grupo B: # | Nombre | Dirección | Municipio | Teléfono | Instagram | Facebook | Valoración | Notas
    let nombre = '', direccion: string | null = null, municipio = '',
        telefono: string | null = null, valoracion: string | null = null,
        instagram: string | null = null, facebook: string | null = null,
        notas: string | null = null;

    if (currentGroup === 'A' && cells.length >= 7) {
      nombre = cells[1];
      direccion = cleanCell(cells[2]);
      municipio = cells[3];
      telefono = cleanCell(cells[4]);
      valoracion = cleanCell(cells[5]);
      notas = cleanCell(cells[6]);
    } else if (currentGroup === 'B' && cells.length >= 9) {
      nombre = cells[1];
      direccion = cleanCell(cells[2]);
      municipio = cells[3];
      telefono = cleanCell(cells[4]);
      instagram = cleanCell(cells[5]);
      facebook = cleanCell(cells[6]);
      valoracion = cleanCell(cells[7]);
      notas = cleanCell(cells[8]);
    } else {
      continue;
    }

    if (!nombre) continue;

    const asteriscado = /\\?\*/.test(nombre);
    nombre = nombre.replace(/\\?\*/g, '').trim();

    rows.push({
      nombre,
      direccion,
      municipio: municipio.trim(),
      telefono,
      valoracion,
      instagram,
      facebook,
      notas,
      asteriscado,
      grupo: currentGroup,
    });
  }

  return rows;
}

function buildNotas(row: ParsedRow): string {
  const parts: string[] = [];
  parts.push(`Grupo ${row.grupo} (${row.grupo === 'A' ? 'sin presencia digital' : 'solo RRSS'})`);
  if (row.direccion) parts.push(`Dirección: ${row.direccion}`);
  if (row.municipio) parts.push(`Municipio: ${row.municipio}`);
  if (row.valoracion) parts.push(`Google: ${row.valoracion}`);
  if (row.instagram) parts.push(`IG: ${row.instagram}`);
  if (row.facebook) parts.push(`FB: ${row.facebook}`);
  if (row.notas) parts.push(`Notas: ${row.notas}`);
  if (row.asteriscado) parts.push('⚠️ Datos parciales — verificar antes de outreach');
  return parts.join('\n');
}

async function importFile(file: string, origen: string): Promise<{ creados: number; saltados: number }> {
  const rows = parseMarkdown(file);
  let creados = 0;
  let saltados = 0;

  for (const row of rows) {
    const emailReal = extractEmail(row.notas);
    const prioridad = computePrioridad(row.nombre, row.asteriscado);

    // Idempotencia: buscamos por (nombre, softwareId, origen) y saltamos si ya existe
    const existing = await prisma.lead.findFirst({
      where: {
        nombre: row.nombre,
        softwareId: SOFTWARE_ID,
        origen,
      },
    });
    if (existing) { saltados++; continue; }

    await prisma.lead.create({
      data: {
        nombre: row.nombre,
        email: emailReal,
        telefono: row.telefono,
        empresa: row.nombre,
        pais: 'España',
        origen,
        softwareId: SOFTWARE_ID,
        estado: LeadEstado.NUEVO,
        prioridad,
        notas: buildNotas(row),
        metadata: {
          municipio: row.municipio,
          direccion: row.direccion,
          valoracionGoogle: row.valoracion,
          instagram: row.instagram,
          facebook: row.facebook,
          grupo: row.grupo,
          datosParciales: row.asteriscado,
        },
      },
    });
    creados++;
  }

  return { creados, saltados };
}

async function main() {
  console.log('🚀 Importando prospectos peluguau...\n');

  // Asegurar que existe el WebhookConfig de peluguau (por si no se sembró)
  await prisma.webhookConfig.upsert({
    where: { saas: SOFTWARE_ID },
    update: {},
    create: {
      saas: SOFTWARE_ID,
      webhookSecret: 'whsec_peluguau_secret_key_2024',
      endpointUrl: '/webhooks/peluguau',
      descripcion: 'PeluGuau - Software para Peluquerías Caninas',
    },
  });

  const bcn = await importFile(FILE_BCN, 'prospeccion-bcn');
  console.log(`📍 Barcelona:  ${bcn.creados} creados, ${bcn.saltados} ya existían`);

  const vlc = await importFile(FILE_VLC, 'prospeccion-vlc');
  console.log(`📍 Valencia:   ${vlc.creados} creados, ${vlc.saltados} ya existían`);

  const totalLeads = await prisma.lead.count({ where: { softwareId: SOFTWARE_ID } });
  console.log(`\n✅ Total leads peluguau en BD: ${totalLeads}`);
}

main()
  .catch(err => { console.error('❌ Error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
