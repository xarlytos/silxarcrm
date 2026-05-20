/**
 * Volcado completo del estado actual de los 4 SaaS atleevo* a 4 ficheros JSON.
 * Cada fichero contiene la lista de leads de ese SaaS. Estos JSON son la
 * "fuente de verdad" sobre la que se editará a mano (mover leads entre archivos,
 * borrarlos, etc.); luego `sync-atleevo-json.ts` reconcilia con la BD.
 *
 * Uso: npx tsx scripts/dump-atleevo-json.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const SOFTWARES = ['atleevo', 'atleevogym', 'atleevoyoga', 'atleevobox'];

function metaStr(meta: unknown, key: string): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const v = (meta as Record<string, unknown>)[key];
  return v === undefined || v === null ? null : String(v);
}
function metaArr(meta: unknown, key: string): string[] {
  if (!meta || typeof meta !== 'object') return [];
  const v = (meta as Record<string, unknown>)[key];
  return Array.isArray(v) ? v.map(String) : [];
}
function metaNum(meta: unknown, key: string): number | null {
  const s = metaStr(meta, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const software of SOFTWARES) {
    const leads = await prisma.lead.findMany({
      where: { softwareId: software },
      include: { etiquetas: { select: { nombre: true } } },
      orderBy: [{ createdAt: 'asc' }],
    });

    const json = leads.map((l) => ({
      id: l.id,
      softwareId: l.softwareId,
      nombre: l.nombre,
      telefono: l.telefono,
      email: l.email,
      empresa: l.empresa,
      estado: l.estado,
      prioridad: l.prioridad,
      origen: l.origen,
      etiquetas: l.etiquetas.map((e) => e.nombre),
      primaryType: metaStr(l.metadata, 'primaryType'),
      types: metaArr(l.metadata, 'types'),
      web: metaStr(l.metadata, 'websiteUri'),
      ciudad: metaStr(l.metadata, 'ciudad'),
      direccion: metaStr(l.metadata, 'formattedAddress'),
      rating: metaNum(l.metadata, 'rating'),
      userRatingCount: metaNum(l.metadata, 'userRatingCount'),
      googleMapsUri: metaStr(l.metadata, 'googleMapsUri'),
      createdAt: l.createdAt.toISOString(),
    }));

    const out = join(OUT_DIR, `${software}.json`);
    writeFileSync(out, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`${software.padEnd(12)} ${leads.length.toString().padStart(5)} leads  ->  ${out}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
