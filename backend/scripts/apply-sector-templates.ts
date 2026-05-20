/**
 * Aplica plantillas de sector a todos los leads sin clasificar.
 * Mucho más rápido que llamar a MiniMax para cada lead.
 *
 * Uso:
 *   npx ts-node scripts/apply-sector-templates.ts --dry-run
 *   npx ts-node scripts/apply-sector-templates.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

interface Template {
  sector: string;
  subsector: string;
  painPoints: string[];
  automationOpportunities: string[];
  softwareType: string;
  pitchTemplate: string;
}

function applyTemplate(lead: any, template: Template): any {
  const meta = lead.metadata || {};
  const nombre = lead.nombre || 'este negocio';
  const ciudad = meta.ciudadBusqueda || 'su ciudad';
  const rating = meta.rating ?? 'buen';
  const resenas = meta.userRatingCount ?? 0;

  const pitch = template.pitchTemplate
    .replace(/\{\{nombre\}\}/g, nombre)
    .replace(/\{\{ciudad\}\}/g, ciudad)
    .replace(/\{\{rating\}\}/g, String(rating))
    .replace(/\{\{reseñas\}\}/g, String(resenas));

  return {
    sector: template.sector,
    subsector: template.subsector,
    painPoints: template.painPoints,
    automationOpportunities: template.automationOpportunities,
    personalizedPitch: pitch,
    softwareType: template.softwareType,
    confidence: 'media' as const,
  };
}

async function main() {
  const templateFile = path.join(__dirname, 'output', 'sector-templates.json');
  if (!fs.existsSync(templateFile)) {
    console.error('❌ No se encontraron plantillas. Ejecuta primero: npx ts-node scripts/generate-sector-templates.ts');
    process.exit(1);
  }

  const templates: Record<string, Template> = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  console.log(`📋 Plantillas cargadas: ${Object.keys(templates).join(', ')}\n`);

  const allLeads = await prisma.lead.findMany({
    where: { softwareId: 'ervok', origen: 'google-maps-pyme' },
    select: { id: true, nombre: true, metadata: true },
  });

  const pending = allLeads.filter((l) => !(l.metadata as any)?.iaClassification);
  console.log(`📊 Total leads: ${allLeads.length} | Sin clasificar: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('✅ Todos los leads ya están clasificados.');
    return;
  }

  // Agrupar por sectorBusqueda
  const bySector: Record<string, typeof pending> = {};
  for (const l of pending) {
    const sb = (l.metadata as any)?.sectorBusqueda || 'desconocido';
    if (!bySector[sb]) bySector[sb] = [];
    bySector[sb].push(l);
  }

  console.log('Distribución por sector:');
  for (const [s, list] of Object.entries(bySector)) {
    const hasTemplate = templates[s] ? '✅' : '❌';
    console.log(`  ${hasTemplate} ${s}: ${list.length}`);
  }

  if (dryRun) {
    console.log('\n🧪 Dry-run. Muestra:');
    for (const [sb, list] of Object.entries(bySector).slice(0, 2)) {
      const t = templates[sb];
      if (!t) continue;
      const example = applyTemplate(list[0], t);
      console.log(`\n  [${sb}] ${list[0].nombre}`);
      console.log(`  Pitch: ${example.personalizedPitch.slice(0, 120)}...`);
    }
    return;
  }

  console.log(`\n🚀 Aplicando plantillas a ${pending.length} leads...`);
  let ok = 0;
  let fail = 0;
  let noTemplate = 0;
  const BATCH = 100;

  for (const [sb, list] of Object.entries(bySector)) {
    const template = templates[sb];
    if (!template) {
      noTemplate += list.length;
      continue;
    }

    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (lead) => {
          try {
            const classification = applyTemplate(lead, template);
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                metadata: {
                  ...(lead.metadata as any),
                  iaClassification: classification,
                  iaClassifiedAt: new Date().toISOString(),
                } as any,
              },
            });
            ok++;
          } catch (e) {
            fail++;
          }
        })
      );
      process.stdout.write(`  ${ok}/${pending.length}\r`);
    }
  }

  console.log(`\n\n✅ Completado:`);
  console.log(`   Aplicados: ${ok}`);
  console.log(`   Fallos:    ${fail}`);
  console.log(`   Sin plantilla: ${noTemplate}`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
