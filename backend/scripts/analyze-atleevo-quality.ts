/**
 * Analiza la calidad de los leads del software 'atleevo' (entrenadores personales):
 *  - Distribución de primaryType
 *  - Distribución de types[]
 *  - Patrones de nombre (¿contiene "entrenador", "personal", "gym", "yoga"...?)
 *  - Detecta outliers (leads que NO parecen entrenadores personales)
 *  - Duplicados sospechosos (mismo telefono o misma web)
 *  - Leads sin teléfono ni web (incontactables)
 *  - Leads dummy/test
 *
 * Uso: npx tsx scripts/analyze-atleevo-quality.ts
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

const KW_TRAINER = /(entrena|personal trainer|coach personal|coach deportivo|preparador físico|preparador fisico)/i;
const KW_NOT_TRAINER = /(gimnasio|gym\b|crossfit|box\b|yoga|pilates|spa\b|masaje|fisio|nutrici|estética|estetica|peluqu|clínica|clinica|hotel|farmacia|academia de baile|escuela de danza|tienda)/i;

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const leads = await prisma.lead.findMany({ where: { softwareId: 'atleevo' }, orderBy: { createdAt: 'asc' } });
  console.log(`Total leads atleevo: ${leads.length}\n`);

  const byPrimaryType: Record<string, number> = {};
  const byTypeAll: Record<string, number> = {};
  const byOrigen: Record<string, number> = {};
  const byCiudad: Record<string, number> = {};

  let nameTrainer = 0;
  let nameNotTrainer = 0;
  let nameNeutral = 0;
  const outliers: { id: string; nombre: string; primaryType: string; ciudad: string; razon: string }[] = [];
  const sinTelSinWeb: { id: string; nombre: string; ciudad: string }[] = [];
  const dummy: { id: string; nombre: string }[] = [];

  const porTelefono: Record<string, string[]> = {};
  const porWeb: Record<string, string[]> = {};

  for (const l of leads) {
    byOrigen[l.origen] = (byOrigen[l.origen] ?? 0) + 1;
    const primaryType = metaStr(l.metadata, 'primaryType') || metaStr(l.metadata, 'primaryTypeDisplayName') || '(none)';
    byPrimaryType[primaryType] = (byPrimaryType[primaryType] ?? 0) + 1;
    for (const t of metaArr(l.metadata, 'types')) {
      byTypeAll[t] = (byTypeAll[t] ?? 0) + 1;
    }
    const ciudad = metaStr(l.metadata, 'ciudad') || metaStr(l.metadata, 'city') || '(none)';
    byCiudad[ciudad] = (byCiudad[ciudad] ?? 0) + 1;

    const nombre = l.nombre || '';
    const isTrainer = KW_TRAINER.test(nombre);
    const isNotTrainer = !isTrainer && KW_NOT_TRAINER.test(nombre);
    if (isTrainer) nameTrainer++;
    else if (isNotTrainer) {
      nameNotTrainer++;
      outliers.push({ id: l.id, nombre, primaryType, ciudad, razon: 'nombre indica otro tipo de negocio' });
    } else {
      nameNeutral++;
    }

    if (!l.telefono && !metaStr(l.metadata, 'websiteUri') && !metaStr(l.metadata, 'web')) {
      sinTelSinWeb.push({ id: l.id, nombre, ciudad });
    }

    if (/^(asd|test|prueba|aaa|xxx|qwe)/i.test(nombre) || nombre.length < 4) {
      dummy.push({ id: l.id, nombre });
    }

    if (l.telefono) {
      const key = l.telefono.replace(/\s+/g, '');
      (porTelefono[key] ||= []).push(`${l.nombre}  [${l.id}]`);
    }
    const web = metaStr(l.metadata, 'websiteUri') || metaStr(l.metadata, 'web');
    if (web) {
      const key = web.replace(/\/+$/, '').toLowerCase();
      (porWeb[key] ||= []).push(`${l.nombre}  [${l.id}]`);
    }
  }

  const dupTel = Object.entries(porTelefono).filter(([, arr]) => arr.length > 1);
  const dupWeb = Object.entries(porWeb).filter(([, arr]) => arr.length > 1);

  const sorted = (o: Record<string, number>) =>
    Object.entries(o).sort((a, b) => b[1] - a[1]);

  console.log('=== Distribución por origen ===');
  for (const [k, v] of sorted(byOrigen)) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log('\n=== Distribución por primaryType (top 15) ===');
  for (const [k, v] of sorted(byPrimaryType).slice(0, 15)) console.log(`  ${k.padEnd(35)} ${v}`);
  console.log('\n=== Distribución por types[] (top 20) ===');
  for (const [k, v] of sorted(byTypeAll).slice(0, 20)) console.log(`  ${k.padEnd(35)} ${v}`);
  console.log('\n=== Distribución por ciudad ===');
  for (const [k, v] of sorted(byCiudad)) console.log(`  ${k.padEnd(20)} ${v}`);

  console.log('\n=== Patrón del nombre ===');
  console.log(`  Indica entrenador personal:    ${nameTrainer}`);
  console.log(`  Indica OTRO tipo de negocio:   ${nameNotTrainer}  <-- outliers`);
  console.log(`  Neutral (no concluyente):      ${nameNeutral}`);

  console.log(`\n=== Sin teléfono ni web (incontactables): ${sinTelSinWeb.length}`);
  console.log(`=== Dummy/test: ${dummy.length}`);
  console.log(`=== Duplicados por teléfono: ${dupTel.length} grupos (${dupTel.reduce((s, [, a]) => s + a.length, 0)} leads)`);
  console.log(`=== Duplicados por web:     ${dupWeb.length} grupos (${dupWeb.reduce((s, [, a]) => s + a.length, 0)} leads)`);

  if (dummy.length) {
    console.log('\nDummy/test:');
    dummy.slice(0, 10).forEach((d) => console.log(`  - "${d.nombre}"  [${d.id}]`));
  }
  if (outliers.length) {
    console.log('\nPrimeros outliers (nombre sugiere otro negocio):');
    outliers.slice(0, 25).forEach((o) =>
      console.log(`  - "${o.nombre}" | primaryType=${o.primaryType} | ${o.ciudad}`),
    );
  }
  if (dupTel.length) {
    console.log('\nPrimeros duplicados por teléfono:');
    dupTel.slice(0, 5).forEach(([tel, arr]) => {
      console.log(`  · ${tel}`);
      arr.forEach((n) => console.log(`      ${n}`));
    });
  }
  if (dupWeb.length) {
    console.log('\nPrimeros duplicados por web:');
    dupWeb.slice(0, 5).forEach(([web, arr]) => {
      console.log(`  · ${web}`);
      arr.forEach((n) => console.log(`      ${n}`));
    });
  }

  const report = {
    softwareId: 'atleevo',
    total: leads.length,
    byOrigen,
    byPrimaryType,
    byCiudad,
    namePattern: { trainer: nameTrainer, otherBusiness: nameNotTrainer, neutral: nameNeutral },
    outliers,
    dummy,
    incontactables: sinTelSinWeb,
    dupTelefono: dupTel.map(([k, arr]) => ({ telefono: k, leads: arr })),
    dupWeb: dupWeb.map(([k, arr]) => ({ web: k, leads: arr })),
  };
  const outFile = join(OUT_DIR, 'atleevo-quality.json');
  writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`\nInforme detallado guardado en: ${outFile}`);
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
