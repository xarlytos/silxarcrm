/**
 * Limpieza v2 de leads 'atleevo' usando primaryType como señal principal
 * (la v1 solo miraba nombre y se le escaparon ~323 leads).
 *
 * Reglas:
 *  1. Si el nombre (normalizado sin acentos) contiene keyword clara de
 *     entrenador personal (entrenador, personal trainer, preparador fisico,
 *     coach personal/deportivo, etc.) -> MANTENER en atleevo.
 *  2. Si primaryType ∈ {gym, fitness_center} -> reasignar a atleevogym.
 *  3. Si primaryType == 'yoga_studio'         -> reasignar a atleevoyoga.
 *  4. Si primaryType ∈ {wellness_center, medical_clinic, educational_institution,
 *     consultant, sports_*, food_store, massage, store, amusement_center,
 *     physiotherapist, government_office, beautician, doctor, chiropractor}
 *     -> tag 'revisar-manualmente'.
 *  5. Si primaryType es health/none pero types[] contiene gym/fitness_center
 *     -> reasignar a atleevogym.
 *
 * Si la reasignación choca con el constraint único (email, software_id) -> borrar
 * el lead de atleevo (es duplicado del SaaS destino).
 *
 * Uso:
 *   npx tsx scripts/clean-atleevo-leads-v2.ts          # dry-run
 *   npx tsx scripts/clean-atleevo-leads-v2.ts --apply  # ejecuta
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const APPLY = process.argv.includes('--apply');
const TAG_REVIEW = 'revisar-manualmente';

const RE_TRAINER = /(entrena|personal\s*train|preparador\s*fisic|coach\s*deport|coach\s*personal|coach\s*fitness|fitness\s*coach)/i;
const RE_PT_INDIVIDUO = /\b(PT|EP)\b/;

const OUTLIER_TYPES = new Set([
  'wellness_center', 'medical_clinic', 'educational_institution', 'consultant',
  'sports_club', 'sports_school', 'sports_complex', 'food_store', 'massage',
  'store', 'amusement_center', 'physiotherapist', 'government_office',
  'beautician', 'doctor', 'chiropractor',
]);
const REASSIGN_TO_GYM_TYPES = new Set(['gym', 'fitness_center']);

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
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

type Lead = Awaited<ReturnType<PrismaClient['lead']['findMany']>>[number];
type Action =
  | { kind: 'keep'; reason: string }
  | { kind: 'reassign'; to: string; reason: string }
  | { kind: 'tag'; reason: string };

function classify(l: Lead): Action {
  const name = stripAccents(l.nombre ?? '');
  if (RE_TRAINER.test(name) || RE_PT_INDIVIDUO.test(l.nombre ?? '')) {
    return { kind: 'keep', reason: 'nombre tiene keyword PT' };
  }
  const primaryType = metaStr(l.metadata, 'primaryType');
  if (REASSIGN_TO_GYM_TYPES.has(primaryType)) {
    return { kind: 'reassign', to: 'atleevogym', reason: `primaryType=${primaryType}` };
  }
  if (primaryType === 'yoga_studio') {
    return { kind: 'reassign', to: 'atleevoyoga', reason: 'primaryType=yoga_studio' };
  }
  if (OUTLIER_TYPES.has(primaryType)) {
    return { kind: 'tag', reason: `primaryType=${primaryType}` };
  }
  const types = metaArr(l.metadata, 'types');
  if (types.some((t) => t === 'gym' || t === 'fitness_center')) {
    return { kind: 'reassign', to: 'atleevogym', reason: `types[] contiene gym/fitness_center (primaryType=${primaryType || 'none'})` };
  }
  return { kind: 'keep', reason: `primaryType=${primaryType || 'none'} sin tipo sospechoso` };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(APPLY ? '*** APPLY MODE ***\n' : '--- DRY RUN ---\n');

  const leads = await prisma.lead.findMany({
    where: { softwareId: 'atleevo' },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Leads atleevo: ${leads.length}\n`);

  const buckets = { keep: [] as Lead[], reassign: [] as { l: Lead; to: string; reason: string }[], tag: [] as { l: Lead; reason: string }[] };
  for (const l of leads) {
    const a = classify(l);
    if (a.kind === 'keep') buckets.keep.push(l);
    else if (a.kind === 'reassign') buckets.reassign.push({ l, to: a.to, reason: a.reason });
    else buckets.tag.push({ l, reason: a.reason });
  }

  const byTarget: Record<string, number> = {};
  for (const r of buckets.reassign) byTarget[r.to] = (byTarget[r.to] ?? 0) + 1;
  const byTagReason: Record<string, number> = {};
  for (const t of buckets.tag) byTagReason[t.reason] = (byTagReason[t.reason] ?? 0) + 1;

  console.log(`Acciones:`);
  console.log(`  KEEP en atleevo:     ${buckets.keep.length}`);
  console.log(`  REASSIGN:            ${buckets.reassign.length}`);
  for (const [k, v] of Object.entries(byTarget)) console.log(`    -> ${k}: ${v}`);
  console.log(`  TAG '${TAG_REVIEW}': ${buckets.tag.length}`);
  for (const [k, v] of Object.entries(byTagReason).sort((a, b) => b[1] - a[1])) {
    console.log(`    · ${k}: ${v}`);
  }
  console.log();

  if (!APPLY) {
    console.log('Para ejecutar: npx tsx scripts/clean-atleevo-leads-v2.ts --apply');
    return;
  }

  // === APPLY ===
  let movedOk = 0;
  let deletedAsDup = 0;
  const movedFail: { id: string; to: string; code: string; msg: string }[] = [];
  for (const r of buckets.reassign) {
    try {
      await prisma.lead.update({ where: { id: r.l.id }, data: { softwareId: r.to } });
      movedOk++;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        await prisma.lead.delete({ where: { id: r.l.id } });
        deletedAsDup++;
      } else {
        movedFail.push({ id: r.l.id, to: r.to, code: e?.code ?? '?', msg: String(e?.message ?? '').split('\n')[0] });
      }
    }
  }
  console.log(`Reasignados: ${movedOk}`);
  console.log(`Borrados por colisión en destino: ${deletedAsDup}`);
  if (movedFail.length) {
    console.log(`Fallos inesperados: ${movedFail.length}`);
    movedFail.slice(0, 10).forEach((f) => console.log(`  - ${f.id} -> ${f.to} [${f.code}]: ${f.msg}`));
  }

  // Etiquetar
  if (buckets.tag.length) {
    const tag = await prisma.leadEtiqueta.upsert({
      where: { nombre: TAG_REVIEW },
      update: {},
      create: { nombre: TAG_REVIEW, color: '#F59E0B' },
    });
    let tagged = 0;
    for (const t of buckets.tag) {
      try {
        await prisma.lead.update({ where: { id: t.l.id }, data: { etiquetas: { connect: { id: tag.id } } } });
        tagged++;
      } catch (e: any) {
        if (e?.code !== 'P2025') throw e;
      }
    }
    console.log(`Etiquetados '${TAG_REVIEW}': ${tagged}`);
  }

  console.log('\nListo.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
