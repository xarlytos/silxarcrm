/**
 * Limpieza de los leads del SaaS 'atleevo' (entrenadores personales).
 *
 * Acciones:
 *  (a) Borra leads dummy/test (origen='manual' con email obviamente falso, o nombre <4 chars).
 *  (b) Deduplica por teléfono dentro de 'atleevo' (deja el lead con más userRatingCount;
 *      tie-break: rating más alto; tie-break: más antiguo).
 *  (c) Reasigna leads a su SaaS correcto cuando el nombre lo indica claramente:
 *        - yoga/pilates   -> atleevoyoga
 *        - crossfit/box   -> atleevobox
 *        - gym/gimnasio   -> atleevogym
 *      Solo si el nombre NO contiene también "entrenador/personal trainer/coach".
 *  (d) Etiqueta el resto de outliers (fisio, nutrición, escuelas, clínicas, estética...)
 *      con la etiqueta 'revisar-manualmente'.
 *
 * Uso:
 *   npx tsx scripts/clean-atleevo-leads.ts          # dry-run (no modifica nada)
 *   npx tsx scripts/clean-atleevo-leads.ts --apply  # ejecuta los cambios
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const APPLY = process.argv.includes('--apply');
const TAG_REVIEW = 'revisar-manualmente';

const RE_TRAINER = /(entrena|personal\s*train|coach|preparador\s*f[ií]sic|trainer|fitness\s*coach|tonificaci)/i;
const RE_YOGA = /(yoga|pilates)/i;
const RE_BOX = /(crossfit|\bbox\b)/i;
const RE_GYM = /(gimnasio|\bgym\b)/i;
const RE_OUTLIER_OTHER = /(fisio|nutrici|peluqu|cl[ií]nica|hotel\b|farmacia|academia|escuela|tienda|\bspa\b|masaje|est[eé]tica|kinesi|ortope|dental|podo|psico|terapi)/i;
const RE_DUMMY_NAME = /^(asd|test|prueba|aaa|xxx|qwe|zzz)/i;
const RE_FAKE_EMAIL = /(@adsasda|@asd|@test|@prueba|@example\.com|@aaa)/i;

function metaStr(meta: unknown, key: string): string {
  if (!meta || typeof meta !== 'object') return '';
  const v = (meta as Record<string, unknown>)[key];
  return v === undefined || v === null ? '' : String(v);
}
function metaNum(meta: unknown, key: string): number {
  const s = metaStr(meta, key);
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function normPhone(p: string | null | undefined): string {
  return (p ?? '').replace(/\D+/g, '');
}

type Lead = Awaited<ReturnType<PrismaClient['lead']['findMany']>>[number];

function classifyForReassign(name: string): string | null {
  if (RE_TRAINER.test(name)) return null;
  if (RE_YOGA.test(name)) return 'atleevoyoga';
  if (RE_BOX.test(name)) return 'atleevobox';
  if (RE_GYM.test(name)) return 'atleevogym';
  return null;
}

function isClearlyDummy(l: Lead): boolean {
  if (l.origen === 'manual' && (l.email ? RE_FAKE_EMAIL.test(l.email) : false)) return true;
  if ((l.nombre ?? '').length < 4) return true;
  if (RE_DUMMY_NAME.test(l.nombre ?? '')) return true;
  return false;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(APPLY ? '*** APPLY MODE — cambios reales ***\n' : '--- DRY RUN — no se modifica nada ---\n');

  const leads = await prisma.lead.findMany({ where: { softwareId: 'atleevo' }, orderBy: { createdAt: 'asc' } });
  console.log(`Leads iniciales en atleevo: ${leads.length}\n`);

  // (a) Dummies
  const toDelete: Lead[] = leads.filter(isClearlyDummy);

  // (b) Deduplicación por teléfono (excluye los dummies ya marcados para borrado)
  const survivors = leads.filter((l) => !toDelete.includes(l));
  const byPhone: Record<string, Lead[]> = {};
  for (const l of survivors) {
    const p = normPhone(l.telefono);
    if (!p) continue;
    (byPhone[p] ||= []).push(l);
  }
  const dupGroups = Object.entries(byPhone).filter(([, arr]) => arr.length > 1);
  const dupToDelete: Lead[] = [];
  for (const [, group] of dupGroups) {
    const sorted = [...group].sort((a, b) => {
      const ca = metaNum(a.metadata, 'userRatingCount');
      const cb = metaNum(b.metadata, 'userRatingCount');
      if (cb !== ca) return cb - ca;
      const ra = metaNum(a.metadata, 'rating');
      const rb = metaNum(b.metadata, 'rating');
      if (rb !== ra) return rb - ra;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    for (const loser of sorted.slice(1)) dupToDelete.push(loser);
  }

  // (c) Reasignación por nombre (entre los supervivientes y no marcados como dedup-loser)
  const remaining = survivors.filter((l) => !dupToDelete.includes(l));
  const reassign: { lead: Lead; toSoftware: string }[] = [];
  for (const l of remaining) {
    const target = classifyForReassign(l.nombre ?? '');
    if (target) reassign.push({ lead: l, toSoftware: target });
  }

  // (d) Outliers restantes para etiquetar
  const stillRemaining = remaining.filter((l) => !reassign.find((r) => r.lead.id === l.id));
  const toTagReview: Lead[] = stillRemaining.filter((l) => RE_OUTLIER_OTHER.test(l.nombre ?? ''));

  // Resumen
  console.log(`(a) Dummy/test a BORRAR:               ${toDelete.length}`);
  toDelete.forEach((l) => console.log(`     - "${l.nombre}" [${l.id}] email=${l.email ?? '-'}`));

  console.log(`\n(b) Duplicados por teléfono a BORRAR: ${dupToDelete.length} (de ${dupGroups.length} grupos)`);
  dupGroups.slice(0, 5).forEach(([phone, group]) => {
    console.log(`     Télf ${phone}  -> ${group.length} fichas, se conservará la de más reseñas`);
  });
  if (dupGroups.length > 5) console.log(`     ... y ${dupGroups.length - 5} grupos más`);

  console.log(`\n(c) Reasignaciones a otro SaaS:        ${reassign.length}`);
  const reassignByTarget: Record<string, number> = {};
  for (const r of reassign) reassignByTarget[r.toSoftware] = (reassignByTarget[r.toSoftware] ?? 0) + 1;
  for (const [k, v] of Object.entries(reassignByTarget)) console.log(`     - ${k}: ${v}`);

  console.log(`\n(d) Outliers a etiquetar '${TAG_REVIEW}': ${toTagReview.length}`);
  toTagReview.slice(0, 10).forEach((l) => console.log(`     - "${l.nombre}" [${l.id}]`));
  if (toTagReview.length > 10) console.log(`     ... y ${toTagReview.length - 10} más`);

  const totalAfter = leads.length - toDelete.length - dupToDelete.length - reassign.length;
  console.log(`\nLeads atleevo después de limpieza: ${totalAfter} (de ${leads.length}, -${leads.length - totalAfter})`);

  const planFile = join(OUT_DIR, `clean-plan-${APPLY ? 'applied' : 'dryrun'}.json`);
  writeFileSync(planFile, JSON.stringify({
    toDelete: toDelete.map((l) => ({ id: l.id, nombre: l.nombre, origen: l.origen, email: l.email })),
    dupToDelete: dupToDelete.map((l) => ({ id: l.id, nombre: l.nombre, telefono: l.telefono })),
    reassign: reassign.map((r) => ({ id: r.lead.id, nombre: r.lead.nombre, from: 'atleevo', to: r.toSoftware })),
    toTagReview: toTagReview.map((l) => ({ id: l.id, nombre: l.nombre })),
    totalAfter,
  }, null, 2) + '\n', 'utf8');
  console.log(`\nPlan guardado en: ${planFile}`);

  if (!APPLY) {
    console.log('\nPara ejecutar los cambios: npx tsx scripts/clean-atleevo-leads.ts --apply');
    return;
  }

  // === APPLY ===
  console.log('\nAplicando cambios...');
  const idsToDelete = [...toDelete.map((l) => l.id), ...dupToDelete.map((l) => l.id)];

  // 1) Borrar (cascada se encarga del historial)
  if (idsToDelete.length) {
    const r = await prisma.lead.deleteMany({ where: { id: { in: idsToDelete } } });
    console.log(`   Borrados: ${r.count}`);
  }

  // 2) Reasignar softwareId (sin transacción global: un fallo no aborta el resto).
  //    Si choca con (email, softwareId) único en el destino, el lead ya existe allí
  //    -> borrar el de atleevo (es duplicado por origen Google Maps).
  let movedOk = 0;
  let deletedAsDup = 0;
  const movedFail: { id: string; to: string; code: string; message: string }[] = [];
  for (const r of reassign) {
    try {
      await prisma.lead.update({ where: { id: r.lead.id }, data: { softwareId: r.toSoftware } });
      movedOk++;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        await prisma.lead.delete({ where: { id: r.lead.id } });
        deletedAsDup++;
      } else {
        movedFail.push({ id: r.lead.id, to: r.toSoftware, code: e?.code ?? '?', message: String(e?.message ?? e).split('\n')[0] });
      }
    }
  }
  console.log(`   Reasignados: ${movedOk}`);
  console.log(`   Borrados (ya existían en SaaS destino): ${deletedAsDup}`);
  if (movedFail.length) {
    console.log(`   Fallos inesperados: ${movedFail.length}`);
    movedFail.slice(0, 10).forEach((f) => console.log(`     - ${f.id} -> ${f.to} [${f.code}]: ${f.message}`));
  }

  // 3) Crear etiqueta si no existe + conectar
  if (toTagReview.length) {
    const tag = await prisma.leadEtiqueta.upsert({
      where: { nombre: TAG_REVIEW },
      update: {},
      create: { nombre: TAG_REVIEW, color: '#F59E0B' },
    });
    let tagged = 0;
    for (const l of toTagReview) {
      try {
        await prisma.lead.update({ where: { id: l.id }, data: { etiquetas: { connect: { id: tag.id } } } });
        tagged++;
      } catch (e: any) {
        // Si el lead ya no existe (fue borrado por dedup/dummy), saltar
        if (e?.code !== 'P2025') throw e;
      }
    }
    console.log(`   Etiquetados con '${TAG_REVIEW}': ${tagged}`);
  }

  console.log('\nListo.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
