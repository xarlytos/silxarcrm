/**
 * Reconcilia los 4 JSON ({atleevo,atleevogym,atleevoyoga,atleevobox}.json)
 * con el estado actual de la BD:
 *
 *  - Si un lead aparece en un JSON con software X y en BD está en software Y -> mover a X.
 *  - Si un lead aparece en BD con softwareId atleevo* pero NO está en ninguno de los 4 JSON
 *    -> borrar de BD.
 *  - Si un lead aparece en un JSON pero NO en BD -> ignorar (los JSON no crean leads).
 *  - Etiquetas: se hace `set` exacto con la lista del JSON (se crea la etiqueta si no existe).
 *  - El resto de campos del JSON (nombre, telefono, etc.) NO se sobreescriben para no perder
 *    información (este script solo gestiona pertenencia a SaaS + etiquetas).
 *
 * Si una reasignación choca con (email, software_id) único en destino -> borra el lead origen.
 *
 * Uso:
 *   npx tsx scripts/sync-atleevo-json.ts            # dry-run
 *   npx tsx scripts/sync-atleevo-json.ts --apply    # ejecuta
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const SOFTWARES = ['atleevo', 'atleevogym', 'atleevoyoga', 'atleevobox'];
const APPLY = process.argv.includes('--apply');

type JsonLead = { id: string; softwareId: string; etiquetas: string[] };

async function main() {
  console.log(APPLY ? '*** APPLY ***\n' : '--- DRY RUN ---\n');

  // 1) Cargar los 4 JSON
  const jsonById = new Map<string, JsonLead>();
  for (const s of SOFTWARES) {
    const path = join(OUT_DIR, `${s}.json`);
    const arr: JsonLead[] = JSON.parse(readFileSync(path, 'utf8'));
    for (const l of arr) {
      if (l.softwareId !== s) {
        console.warn(`WARN: lead ${l.id} dentro de ${s}.json pero softwareId='${l.softwareId}' — uso el del fichero (${s})`);
      }
      jsonById.set(l.id, { id: l.id, softwareId: s, etiquetas: l.etiquetas ?? [] });
    }
    console.log(`Cargado ${s}.json: ${arr.length} leads`);
  }
  console.log();

  // 2) Leer BD (todos los leads en SaaS atleevo*)
  const dbLeads = await prisma.lead.findMany({
    where: { softwareId: { in: SOFTWARES } },
    include: { etiquetas: { select: { id: true, nombre: true } } },
  });

  // 3) Calcular diff
  const toMove: { id: string; from: string; to: string }[] = [];
  const toDelete: { id: string; from: string; nombre: string }[] = [];
  const tagsToChange: { id: string; current: string[]; target: string[] }[] = [];

  for (const db of dbLeads) {
    const j = jsonById.get(db.id);
    if (!j) {
      toDelete.push({ id: db.id, from: db.softwareId, nombre: db.nombre });
      continue;
    }
    if (j.softwareId !== db.softwareId) {
      toMove.push({ id: db.id, from: db.softwareId, to: j.softwareId });
    }
    const current = db.etiquetas.map((e) => e.nombre).sort();
    const target = [...j.etiquetas].sort();
    if (JSON.stringify(current) !== JSON.stringify(target)) {
      tagsToChange.push({ id: db.id, current, target });
    }
  }

  console.log(`A MOVER (cambio de softwareId):   ${toMove.length}`);
  const moveByPair: Record<string, number> = {};
  for (const m of toMove) {
    const k = `${m.from} -> ${m.to}`;
    moveByPair[k] = (moveByPair[k] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(moveByPair)) console.log(`   ${k}: ${v}`);

  console.log(`\nA BORRAR (no aparecen en JSON):   ${toDelete.length}`);
  const delByFrom: Record<string, number> = {};
  for (const d of toDelete) delByFrom[d.from] = (delByFrom[d.from] ?? 0) + 1;
  for (const [k, v] of Object.entries(delByFrom)) console.log(`   ${k}: ${v}`);
  if (toDelete.length) {
    console.log('   Primeros 10:');
    toDelete.slice(0, 10).forEach((d) => console.log(`     - [${d.from}] "${d.nombre}" (${d.id})`));
  }

  console.log(`\nCAMBIOS DE ETIQUETAS:             ${tagsToChange.length}`);
  if (tagsToChange.length) {
    console.log('   Primeros 5:');
    tagsToChange.slice(0, 5).forEach((t) =>
      console.log(`     - ${t.id}: [${t.current.join(',')}] -> [${t.target.join(',')}]`),
    );
  }

  if (!APPLY) {
    console.log('\nPara ejecutar: npx tsx scripts/sync-atleevo-json.ts --apply');
    return;
  }

  // === APPLY ===
  // a) Borrar leads que no están en JSON
  let deleted = 0;
  if (toDelete.length) {
    const r = await prisma.lead.deleteMany({ where: { id: { in: toDelete.map((d) => d.id) } } });
    deleted = r.count;
  }
  console.log(`\nBorrados: ${deleted}`);

  // b) Mover (cambio softwareId). En caso de P2002 -> borra origen
  let moved = 0, dupDeleted = 0;
  const failures: { id: string; to: string; err: string }[] = [];
  for (const m of toMove) {
    try {
      await prisma.lead.update({ where: { id: m.id }, data: { softwareId: m.to } });
      moved++;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        await prisma.lead.delete({ where: { id: m.id } });
        dupDeleted++;
      } else {
        failures.push({ id: m.id, to: m.to, err: String(e?.message ?? '').split('\n')[0] });
      }
    }
  }
  console.log(`Movidos: ${moved}`);
  console.log(`Borrados por colisión en destino: ${dupDeleted}`);
  if (failures.length) {
    console.log(`Fallos: ${failures.length}`);
    failures.slice(0, 10).forEach((f) => console.log(`   - ${f.id} -> ${f.to}: ${f.err}`));
  }

  // c) Etiquetas: set exacto
  let tagsUpdated = 0;
  // Cachear tags por nombre, crear las que falten
  const allTagNames = new Set<string>();
  for (const t of tagsToChange) for (const n of t.target) allTagNames.add(n);
  const tagByName = new Map<string, string>();
  for (const name of allTagNames) {
    const tag = await prisma.leadEtiqueta.upsert({
      where: { nombre: name },
      update: {},
      create: { nombre: name, color: name === 'revisar-manualmente' ? '#F59E0B' : '#6B7280' },
    });
    tagByName.set(name, tag.id);
  }
  for (const t of tagsToChange) {
    try {
      await prisma.lead.update({
        where: { id: t.id },
        data: {
          etiquetas: {
            set: t.target.map((n) => ({ id: tagByName.get(n)! })),
          },
        },
      });
      tagsUpdated++;
    } catch (e: any) {
      if (e?.code !== 'P2025') throw e;  // P2025 = ya no existe (borrado antes)
    }
  }
  console.log(`Etiquetas actualizadas: ${tagsUpdated}`);

  console.log('\nListo.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
