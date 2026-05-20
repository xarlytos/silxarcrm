/**
 * Lee atleevo-minimax-decisions.json y aplica los cambios sobre los 4 JSON
 * de SaaS. Luego, con sync-atleevo-json.ts --apply, se reflejan en BD.
 *
 * Filtros opcionales (variables de entorno):
 *   ONLY_CONFIDENCE=alta            -> solo aplica decisiones con confianza alta
 *   ONLY_CATEGORIES=fisio,nutricion -> solo esas categorías
 *
 * Uso: npx tsx scripts/apply-minimax-decisions.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const TAG_REVIEW = 'revisar-manualmente';

const ONLY_CONFIDENCE = process.env.ONLY_CONFIDENCE; // alta|media|baja
const ONLY_CATEGORIES = process.env.ONLY_CATEGORIES?.split(',').map((s) => s.trim()).filter(Boolean);

interface Decision { id: string; action: string; nombre: string; reason: string; confidence: string; category: string; }

function load(file: string): any[] {
  return JSON.parse(readFileSync(join(OUT_DIR, file), 'utf8'));
}
function save(file: string, data: any[]) {
  writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  const decisions: Decision[] = JSON.parse(readFileSync(join(OUT_DIR, 'atleevo-minimax-decisions.json'), 'utf8'));
  console.log(`Total decisiones leídas: ${decisions.length}`);
  if (ONLY_CONFIDENCE) console.log(`Filtro: confidence=${ONLY_CONFIDENCE}`);
  if (ONLY_CATEGORIES) console.log(`Filtro: categorías=${ONLY_CATEGORIES.join(',')}`);

  let filtered = decisions;
  if (ONLY_CONFIDENCE) filtered = filtered.filter((d) => d.confidence === ONLY_CONFIDENCE);
  if (ONLY_CATEGORIES) filtered = filtered.filter((d) => ONLY_CATEGORIES.includes(d.category));
  console.log(`A aplicar: ${filtered.length}\n`);

  const atleevo = load('atleevo.json');
  const gym = load('atleevogym.json');
  const yoga = load('atleevoyoga.json');
  const box = load('atleevobox.json');
  const byId = new Map(atleevo.map((l: any) => [l.id, l]));

  const counts: Record<string, number> = {};
  const notFound: string[] = [];

  for (const d of filtered) {
    const l = byId.get(d.id);
    if (!l) { notFound.push(`${d.id} ${d.nombre}`); continue; }

    counts[d.action] = (counts[d.action] ?? 0) + 1;

    if (d.action === 'tag') {
      if (!l.etiquetas.includes(TAG_REVIEW)) l.etiquetas.push(TAG_REVIEW);
    } else if (d.action === 'delete') {
      byId.delete(d.id);
    } else if (d.action === 'move-gym' || d.action === 'move-yoga' || d.action === 'move-box') {
      const target = d.action === 'move-gym' ? 'atleevogym' : d.action === 'move-yoga' ? 'atleevoyoga' : 'atleevobox';
      const arr = target === 'atleevogym' ? gym : target === 'atleevoyoga' ? yoga : box;
      l.etiquetas = (l.etiquetas || []).filter((t: string) => t !== TAG_REVIEW);
      l.softwareId = target;
      arr.push(l);
      byId.delete(d.id);
    }
  }

  const newAtleevo = Array.from(byId.values());
  save('atleevo.json', newAtleevo);
  save('atleevogym.json', gym);
  save('atleevoyoga.json', yoga);
  save('atleevobox.json', box);

  console.log('Aplicado:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`\natleevo.json:    ${atleevo.length} -> ${newAtleevo.length}`);
  console.log(`atleevogym.json: -> ${gym.length}`);
  console.log(`atleevoyoga.json: -> ${yoga.length}`);
  console.log(`atleevobox.json: -> ${box.length}`);
  if (notFound.length) {
    console.log(`\nNo encontrados en atleevo.json (probablemente ya movidos): ${notFound.length}`);
    notFound.slice(0, 10).forEach((x) => console.log(`  - ${x}`));
  }
  console.log('\nSiguiente paso: npx tsx scripts/sync-atleevo-json.ts --apply');
}

main();
