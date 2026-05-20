/**
 * Aplica reglas más estrictas sobre los 4 JSON {atleevo,atleevogym,atleevoyoga,atleevobox}.json
 * para clasificar los leads de atleevo que se escaparon a las pasadas anteriores.
 *
 * Reglas (orden de prioridad):
 *   1. PT FUERTE: nombre contiene una keyword inequívoca de entrenador personal
 *      ("entrenador personal", "personal trainer", "preparador fisico", "coach personal",
 *       "coach deportivo", "coach fitness", "personal training", "entrenamiento personal")
 *      -> MANTENER en atleevo.
 *   2. APP/SOFTWARE COMPETIDOR: nombre contiene "app", "aplicacion" o ".com"/"online"
 *      sin ser PT fuerte -> BORRAR del JSON (no es un lead real).
 *   3. ANTI-KEYWORDS GIMNASIO: fitclub, fit club, fitness club, club fitness, training studio,
 *      fitness studio, studio fitness, training center, fitness center, boutique, gymboutique,
 *      multiespacio, fit club, centro deportivo, club deportivo
 *      -> MOVER a atleevogym.
 *   4. Si no entra en nada -> dejar como está.
 *
 * Solo se procesan leads que estén actualmente en atleevo.json (no toca el resto).
 *
 * Uso: npx tsx scripts/apply-rules-to-json.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Conexión flexible entre "entrenador" y "personal" (separadores arbitrarios: //, |, -, &, espacios)
// Capta "entrenador/entrenadora/entrenamiento" cerca de "personal" en cualquier orden
const RE_STRONG_PT_COMBINED = /(entrena(dor|dora|miento)?[\s\W]{0,15}personal|personal[\s\W]{0,15}(trainer|training|coach|entrena))/i;
const RE_STRONG_PT_SOLO = /(preparador(a)?\s*fisic|coach\s*personal|coach\s*deport|coach\s*fitness|fitness\s*coach|personalizado)/i;
function isStrongPT(name: string): boolean {
  return RE_STRONG_PT_COMBINED.test(name) || RE_STRONG_PT_SOLO.test(name);
}
const RE_APP = /(\bapp\b|aplicaci[oó]n|tu\s*app)/i;
const RE_GYM_ANTI = /(fit\s*club|fitclub|fitness\s*club|club\s*fitness|training\s*studio|fitness\s*studio|studio\s*fitness|training\s*center|fitness\s*center|gym\s*boutique|gymboutique|multiespacio|centro\s*deportivo|club\s*deportivo|centro\s*de\s*fitness)/i;

type Lead = {
  id: string;
  softwareId: string;
  nombre: string;
  [k: string]: unknown;
};

function classify(l: Lead): { action: 'keep' | 'app-delete' | 'to-gym'; reason: string } {
  const name = stripAccents(l.nombre ?? '');
  if (isStrongPT(name)) return { action: 'keep', reason: 'PT fuerte' };
  if (RE_APP.test(name)) return { action: 'app-delete', reason: 'app/competidor' };
  if (RE_GYM_ANTI.test(name)) return { action: 'to-gym', reason: 'anti-keyword gym' };
  return { action: 'keep', reason: 'neutral' };
}

function load(path: string): Lead[] {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function save(path: string, leads: Lead[]) {
  writeFileSync(path, JSON.stringify(leads, null, 2) + '\n', 'utf8');
}

function main() {
  const atleevoPath = join(OUT_DIR, 'atleevo.json');
  const gymPath = join(OUT_DIR, 'atleevogym.json');

  const atleevo = load(atleevoPath);
  const gym = load(gymPath);

  const kept: Lead[] = [];
  const toGym: Lead[] = [];
  const appDelete: Lead[] = [];

  for (const l of atleevo) {
    const c = classify(l);
    if (c.action === 'keep') kept.push(l);
    else if (c.action === 'to-gym') toGym.push({ ...l, softwareId: 'atleevogym' });
    else appDelete.push(l);
  }

  console.log(`Entrada atleevo.json: ${atleevo.length}`);
  console.log(`  KEEP en atleevo:           ${kept.length}`);
  console.log(`  MOVER a atleevogym:        ${toGym.length}`);
  console.log(`  BORRAR (app competidor):   ${appDelete.length}`);

  if (toGym.length) {
    console.log('\nLeads a MOVER a atleevogym:');
    toGym.forEach((l) => console.log(`  - "${l.nombre}"  [${l.id}]`));
  }
  if (appDelete.length) {
    console.log('\nLeads a BORRAR (app/competidor):');
    appDelete.forEach((l) => console.log(`  - "${l.nombre}"  [${l.id}]`));
  }

  // Escribir cambios en los JSON
  save(atleevoPath, kept);
  save(gymPath, [...gym, ...toGym]);
  console.log(`\natleevo.json: ${atleevo.length} -> ${kept.length}`);
  console.log(`atleevogym.json: ${gym.length} -> ${gym.length + toGym.length}`);
  console.log('\nJSON actualizados. Revisa el diff y luego ejecuta: npx tsx scripts/sync-atleevo-json.ts --apply');
}

main();
