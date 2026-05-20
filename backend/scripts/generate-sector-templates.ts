/**
 * Genera plantillas de análisis por sector con MiniMax (una sola vez).
 * Luego apply-sector-templates.ts las aplica a todos los leads.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'MiniMax-M2.7';

const SECTORES = [
  { busqueda: 'clínica dental', sector: 'salud', subsector: 'clínica dental' },
  { busqueda: 'gimnasio', sector: 'fitness', subsector: 'gimnasio' },
  { busqueda: 'asesoría fiscal', sector: 'servicios profesionales', subsector: 'asesoría fiscal' },
  { busqueda: 'taller mecánico', sector: 'automoción', subsector: 'taller mecánico' },
  { busqueda: 'restaurante', sector: 'hostelería', subsector: 'restaurante' },
  { busqueda: 'peluquería', sector: 'belleza', subsector: 'peluquería' },
  { busqueda: 'veterinaria', sector: 'salud animal', subsector: 'veterinaria' },
  { busqueda: 'fisioterapia', sector: 'salud', subsector: 'fisioterapia' },
  { busqueda: 'inmobiliaria', sector: 'inmobiliaria', subsector: 'agencia inmobiliaria' },
  { busqueda: 'farmacia', sector: 'salud', subsector: 'farmacia' },
  { busqueda: 'óptica', sector: 'salud', subsector: 'óptica' },
  { busqueda: 'academia de idiomas', sector: 'educación', subsector: 'academia de idiomas' },
];

async function callMiniMax(sector: string, subsector: string): Promise<any> {
  const prompt = `Eres consultor de digitalización para PYMES españolas. Genera un análisis genérico para vender software a medida a ${subsector}s en España.

Responde ÚNICAMENTE con JSON válido (sin markdown, sin texto extra):
{
  "painPoints": ["problema típico 1", "problema típico 2", "problema típico 3"],
  "automationOpportunities": ["automatización recomendada 1", "automatización recomendada 2"],
  "softwareType": "tipo de software recomendado para este sector",
  "pitchTemplate": "Plantilla de pitch con placeholders: usa {{nombre}} para el nombre del negocio, {{ciudad}} para la ciudad, {{rating}} para el rating y {{reseñas}} para el número de reseñas. Ejemplo: '{{nombre}}, con {{rating}} estrellas en {{ciudad}}, ya demuestra calidad...'"
}`;

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Eres un consultor de digitalización. Responde ÚNICAMENTE con JSON puro.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: any = await res.json();
  let text = data.choices?.[0]?.message?.content || '';
  const fm = text.match(/```json\s*([\s\S]*?)```/);
  if (fm) text = fm[1].trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return JSON.parse(text);
}

async function main() {
  const templates: Record<string, any> = {};
  for (const s of SECTORES) {
    process.stdout.write(`Generando plantilla para ${s.subsector}... `);
    try {
      const t = await callMiniMax(s.sector, s.subsector);
      templates[s.busqueda] = { sector: s.sector, subsector: s.subsector, ...t };
      console.log('OK');
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.log(`FAIL: ${(e as Error).message}`);
    }
  }

  const outFile = path.join(__dirname, 'output', 'sector-templates.json');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(templates, null, 2));
  console.log(`\n💾 Plantillas guardadas en: ${outFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
