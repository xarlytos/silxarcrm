/**
 * Enriquece leads de ervok con análisis de MiniMax AI.
 *
 * Usa el sector conocido (metadata.sectorBusqueda) del scan de Google Places
 * y solo pide a MiniMax lo que aporta valor: pain points, automatizaciones,
 * tipo de software recomendado y pitch personalizado.
 *
 * Uso:
 *   npx ts-node scripts/classify-leads-ervok-minimax.ts --limit=10 --dry-run
 *   npx ts-node scripts/classify-leads-ervok-minimax.ts --limit=50
 *   npx ts-node scripts/classify-leads-ervok-minimax.ts              # todos los sin clasificar
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}

const dryRun = Boolean(flags['dry-run']);
const limit = flags.limit ? parseInt(String(flags.limit), 10) : undefined;
const batchSize = parseInt(String(flags.batch || '10'), 10);
const sectorFilter = flags.sector ? String(flags.sector) : undefined;

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'MiniMax-M2.7';

if (!API_KEY) {
  console.error('❌ Falta OPENAI_API_KEY en .env');
  process.exit(1);
}

// Mapeo directo: sectorBusqueda (del scan) → sector/subsector conocidos
const SECTOR_MAP: Record<string, { sector: string; subsector: string }> = {
  'clínica dental': { sector: 'salud', subsector: 'clínica dental' },
  'gimnasio': { sector: 'fitness', subsector: 'gimnasio' },
  'asesoría fiscal': { sector: 'servicios profesionales', subsector: 'asesoría fiscal' },
  'taller mecánico': { sector: 'automoción', subsector: 'taller mecánico' },
};

interface IaEnrichment {
  painPoints: string[];
  automationOpportunities: string[];
  personalizedPitch: string;
  softwareType: string;
  confidence: 'alta' | 'media' | 'baja';
}

interface LeadWithMeta {
  id: string;
  nombre: string;
  notas: string | null;
  metadata: any;
}

function buildPrompt(lead: LeadWithMeta, knownSector: string, knownSubsector: string): string {
  const meta = lead.metadata || {};

  return `Eres consultor de digitalización para PYMES españolas. Genera un análisis para vender software a medida.

NEGOCIO:
- Nombre: ${lead.nombre}
- Sector: ${knownSubsector} (${knownSector})
- Ciudad: ${meta.ciudadBusqueda || 'España'}
- Rating: ${meta.rating !== undefined ? `${meta.rating}⭐ (${meta.userRatingCount || 0} reseñas)` : 'sin rating'}
- Web: ${meta.websiteUri || 'sin web'}
${meta.primaryTypeDisplayName ? `- Tipo Google: ${meta.primaryTypeDisplayName}` : ''}
${lead.notas ? `- Notas: ${lead.notas.split('\n').slice(0, 2).join('; ')}` : ''}

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra):
{
  "painPoints": ["problema 1", "problema 2", "problema 3"],
  "automationOpportunities": ["proceso automatizable 1", "proceso automatizable 2"],
  "personalizedPitch": "Pitch de 3-4 frases en español, directo y sin fluff. Menciona datos del negocio (rating, reseñas, ciudad) y cómo el software resolvería sus problemas.",
  "softwareType": "tipo de solución recomendada (ej: ERP + app móvil, CRM con automatización, plataforma de reservas)",
  "confidence": "alta|media|baja"
}`;
}

async function callMiniMax(prompt: string): Promise<IaEnrichment | null> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Eres un consultor de digitalización para PYMES españolas. Responde ÚNICAMENTE con JSON puro, sin markdown, sin etiquetas <think>, sin texto adicional.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MiniMax HTTP ${res.status}: ${err.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  let jsonText = content;

  const thinkMatch = content.match(/<think>[\s\S]*?<\/think>/);
  if (thinkMatch) jsonText = content.replace(thinkMatch[0], '');

  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  else jsonText = jsonText.trim();

  jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(jsonText) as IaEnrichment;
  } catch (err) {
    console.error(`  ❌ JSON parse error: ${(err as Error).message}`);
    console.error(`  Raw: ${content.slice(0, 400)}`);
    return null;
  }
}

async function main() {
  console.log(`🤖 Enriquecimiento de leads ervok con MiniMax`);
  console.log(`   Modelo: ${MODEL}`);
  console.log(`   dryRun=${dryRun}  limit=${limit ?? 'todos'}  batch=${batchSize}  sector=${sectorFilter ?? 'todos'}\n`);

  const where: any = { softwareId: 'ervok', origen: 'google-maps-pyme' };

  const allLeads = await prisma.lead.findMany({
    where,
    select: { id: true, nombre: true, notas: true, metadata: true },
  });

  let unclassified = allLeads.filter((l) => {
    const meta = l.metadata as any;
    return !meta?.iaClassification;
  });

  if (sectorFilter) {
    unclassified = unclassified.filter((l) => (l.metadata as any)?.sectorBusqueda === sectorFilter);
  }

  // Agrupar por sectorBusqueda para diversidad
  const bySectorBusqueda: Record<string, typeof unclassified> = {};
  for (const l of unclassified) {
    const sb = (l.metadata as any)?.sectorBusqueda || 'desconocido';
    if (!bySectorBusqueda[sb]) bySectorBusqueda[sb] = [];
    bySectorBusqueda[sb].push(l);
  }

  const toProcess: typeof unclassified = [];
  const sectors = Object.keys(bySectorBusqueda);
  let idx = 0;
  while (toProcess.length < (limit ?? unclassified.length)) {
    let added = false;
    for (const s of sectors) {
      const pool = bySectorBusqueda[s];
      if (idx < pool.length) {
        toProcess.push(pool[idx]);
        added = true;
        if (limit && toProcess.length >= limit) break;
      }
    }
    if (!added) break;
    idx++;
  }

  console.log(`📊 Leads ervok total: ${allLeads.length}`);
  console.log(`   Sin clasificar:    ${unclassified.length}`);
  console.log(`   Sectores scan:     ${sectors.join(', ')}`);
  console.log(`   A procesar:        ${toProcess.length}\n`);

  if (toProcess.length === 0) {
    console.log('✅ Todos los leads ya están enriquecidos.');
    return;
  }

  const results: { leadId: string; nombre: string; sectorBusqueda: string; enrichment: IaEnrichment | null; error?: string }[] = [];
  let ok = 0;
  let fail = 0;
  const t0 = Date.now();

  for (let i = 0; i < toProcess.length; i += batchSize) {
    const batch = toProcess.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (lead) => {
        const sectorBusqueda = (lead.metadata as any)?.sectorBusqueda || '';
        const mapped = SECTOR_MAP[sectorBusqueda] || { sector: 'desconocido', subsector: sectorBusqueda };
        const prompt = buildPrompt(lead, mapped.sector, mapped.subsector);

        try {
          const enrichment = await callMiniMax(prompt);
          if (enrichment) {
            ok++;
            if (!dryRun) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  metadata: {
                    ...(lead.metadata as any),
                    iaClassification: {
                      sector: mapped.sector,
                      subsector: mapped.subsector,
                      ...enrichment,
                    },
                    iaClassifiedAt: new Date().toISOString(),
                  } as any,
                },
              });
            }
          } else {
            fail++;
          }
          return { leadId: lead.id, nombre: lead.nombre, sectorBusqueda, enrichment };
        } catch (err) {
          fail++;
          return { leadId: lead.id, nombre: lead.nombre, sectorBusqueda, enrichment: null, error: (err as Error).message };
        }
      })
    );

    results.push(...batchResults);
    process.stdout.write(`  ${Math.min(i + batchSize, toProcess.length)}/${toProcess.length}  OK=${ok} FAIL=${fail}\r`);

    if (i + batchSize < toProcess.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✅ Completado en ${elapsed}s`);
  console.log(`   Enriquecidos OK: ${ok}`);
  console.log(`   Fallos:          ${fail}`);

  // Stats por sectorBusqueda
  const bySB: Record<string, number> = {};
  const bySoftwareType: Record<string, number> = {};
  for (const r of results) {
    if (r.enrichment) {
      bySB[r.sectorBusqueda] = (bySB[r.sectorBusqueda] || 0) + 1;
      bySoftwareType[r.enrichment.softwareType] = (bySoftwareType[r.enrichment.softwareType] || 0) + 1;
    }
  }

  console.log(`\n📊 Por búsqueda original:`);
  for (const [s, n] of Object.entries(bySB).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${s.padEnd(25)} ${n}`);
  }

  console.log(`\n📊 Tipos de software recomendados (top 10):`);
  for (const [t, n] of Object.entries(bySoftwareType).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`   ${t.padEnd(40)} ${n}`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `ervok-enrichment-${ts}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ total: results.length, ok, fail, results }, null, 2));
  console.log(`\n💾 Resultados: ${outFile}`);

  // Ejemplos
  const examples = results.filter((r) => r.enrichment).slice(0, 3);
  if (examples.length) {
    console.log(`\n📝 Ejemplos de pitches:`);
    for (const ex of examples) {
      const ia = ex.enrichment!;
      const mapped = SECTOR_MAP[ex.sectorBusqueda] || { sector: '?', subsector: ex.sectorBusqueda };
      console.log(`\n   [${mapped.sector} → ${mapped.subsector}] ${ex.nombre}`);
      console.log(`   Software: ${ia.softwareType}`);
      console.log(`   Pitch: ${ia.personalizedPitch.slice(0, 200)}...`);
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
