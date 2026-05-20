/**
 * Clasifica los leads del SaaS 'atleevo' usando MiniMax para detectar cuáles NO son
 * entrenadores personales individuales. La heurística regex es limitada; con AI
 * podemos analizar nombre + web + tipos Google + dirección y decidir bien.
 *
 * Categorías:
 *   pt-individual    -> entrenador personal individual o estudio pequeño 1-a-1
 *   gimnasio         -> gimnasio o studio fitness (varias personas a la vez, cuotas mensuales)
 *   crossfit-box     -> box de crossfit / cross training / funcional grupal
 *   yoga-pilates     -> estudio yoga/pilates
 *   fisio            -> clínica fisioterapia / readaptación
 *   nutricion        -> nutricionista / dietista
 *   clinica-medica   -> clínica médica / wellness center
 *   escuela          -> escuela / academia / oposiciones / instituto de formación
 *   app-online       -> app / software / servicio digital (competidor)
 *   otro             -> ninguna de las anteriores
 *
 * Salida: atleevo-minimax-classifications.json (incremental, resumable).
 *
 * Uso:
 *   npx tsx scripts/classify-atleevo-minimax.ts --limit=20       # prueba
 *   npx tsx scripts/classify-atleevo-minimax.ts                  # todos los no clasificados
 *   npx tsx scripts/classify-atleevo-minimax.ts --batch=5        # menos concurrencia
 *   npx tsx scripts/classify-atleevo-minimax.ts --apply          # tras clasificar, escribe decisiones
 *
 * Después, revisa el JSON de decisiones y aplica con:
 *   npx tsx scripts/sync-atleevo-json.ts --apply
 */
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const CLASSIF_FILE = join(OUT_DIR, 'atleevo-minimax-classifications.json');

const args = process.argv.slice(2);
const flags: Record<string, string | boolean> = {};
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v === undefined ? true : v;
  }
}
const LIMIT = flags.limit ? parseInt(String(flags.limit), 10) : undefined;
const BATCH = parseInt(String(flags.batch ?? '4'), 10);
const RETRIES = parseInt(String(flags.retries ?? '2'), 10);
const APPLY = Boolean(flags.apply);
const FORCE = Boolean(flags.force); // reclasificar también los ya clasificados

const API_KEY = process.env.OPENAI_API_KEY!;
const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.OPENAI_MODEL || 'minimax-m2.7';
if (!API_KEY) { console.error('Falta OPENAI_API_KEY'); process.exit(1); }

type Category =
  | 'pt-individual' | 'gimnasio' | 'crossfit-box' | 'yoga-pilates'
  | 'fisio' | 'nutricion' | 'clinica-medica' | 'escuela'
  | 'app-online' | 'otro';
type Confidence = 'alta' | 'media' | 'baja';

interface Classification {
  category: Category;
  confidence: Confidence;
  reason: string;
}
interface ResultRow {
  id: string;
  nombre: string;
  classification: Classification | null;
  error?: string;
  classifiedAt: string;
}
interface Lead {
  id: string; nombre: string; softwareId: string;
  primaryType: string | null; types: string[];
  web: string | null; ciudad: string | null;
  direccion: string | null; etiquetas: string[];
  rating: number | null; userRatingCount: number | null;
}

const SYSTEM = `Eres un experto en clasificación de negocios de fitness/salud en España. Lees datos de Google Maps y decides si un negocio es un ENTRENADOR PERSONAL individual o algo distinto.

Devuelve SOLO JSON puro, sin markdown ni <think>. Esquema:
{ "category": "pt-individual|gimnasio|crossfit-box|yoga-pilates|fisio|nutricion|clinica-medica|escuela|app-online|otro", "confidence": "alta|media|baja", "reason": "1 frase corta en español" }

Definiciones (importante distinguir):
- pt-individual: entrenador personal individual o estudio pequeño que ofrece sesiones 1-a-1 o grupos muy reducidos. Suele ser el nombre de una persona (ej. "Javier Panizo Entrenador Personal") o un centro pequeño con "Entrenamiento Personal" en el nombre. Avanza Fit, SANO, JG fitness, ONFIT89 son CADENAS de entrenamiento personal -> pt-individual.
- gimnasio: gimnasio comercial con cuotas mensuales y múltiples usuarios simultáneos. Ej. Synergym, Curves, Fitness Park, Basic-Fit, Dreamfit, McFit, Anytime Fitness. También "Fitness Club", "Gym Boutique", "Fitness Studio" sin mención clara de entrenamiento personal individual.
- crossfit-box: box de crossfit/cross training, funcional grupal.
- yoga-pilates: estudio de yoga o pilates.
- fisio: clínica de fisioterapia, recuperación deportiva, osteopatía (aunque ofrezca entrenamiento como complemento).
- nutricion: nutricionista/dietista (aunque ofrezca entrenamiento).
- clinica-medica: clínica médica, wellness center general, hospital.
- escuela: academia, escuela de formación, oposiciones, instituto, universidad.
- app-online: app, software, servicio digital sin sede física.
- otro: tienda, estética, masaje, asociación deportiva, etc.

Si el negocio combina varias actividades, elige la PRIMARIA (la que aparece primero o la que da nombre). Centros de "Entrenamiento Personal + Fisioterapia/Nutrición" donde el entrenamiento es lo principal -> pt-individual.

confidence=alta si está clarísimo. baja si no hay web ni info suficiente.`;

function buildPrompt(l: Lead): string {
  return `Negocio:
- Nombre: ${l.nombre}
- Ciudad: ${l.ciudad ?? '?'}
- Dirección: ${l.direccion ?? '?'}
- Web: ${l.web ?? 'sin web'}
- Google primaryType: ${l.primaryType ?? '?'}
- Google types: ${(l.types || []).slice(0, 8).join(', ')}
- Rating: ${l.rating ?? '?'}⭐ (${l.userRatingCount ?? 0} reseñas)

Clasifícalo. Devuelve JSON.`;
}

async function callMiniMaxOnce(prompt: string): Promise<Classification | null> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  let content = data.choices?.[0]?.message?.content ?? '';
  if (!content || !content.trim()) return null;
  content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) content = fence[1];
  // Si la respuesta llega truncada (no acaba en }), intentar cerrar el JSON
  content = content.trim().replace(/,\s*([}\]])/g, '$1');
  if (!content.endsWith('}')) {
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace > 0) content = content.slice(0, lastBrace + 1);
  }
  try {
    const j = JSON.parse(content) as Classification;
    if (!j.category || !j.confidence) throw new Error('campos vacíos');
    return j;
  } catch (e) {
    return null;
  }
}

async function callMiniMax(prompt: string): Promise<Classification | null> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const c = await callMiniMaxOnce(prompt);
      if (c) return c;
    } catch (e) {
      if (attempt === RETRIES) throw e;
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return null;
}

function loadJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const leads: Lead[] = loadJson<Lead[]>(join(OUT_DIR, 'atleevo.json'), []);
  if (!leads.length) { console.error('atleevo.json vacío — corre dump-atleevo-json.ts primero'); process.exit(1); }

  const previous = loadJson<{ results: ResultRow[] }>(CLASSIF_FILE, { results: [] });
  const previousById = new Map(previous.results.map((r) => [r.id, r]));

  const pending = leads.filter((l) => FORCE || !previousById.has(l.id) || previousById.get(l.id)?.classification == null);
  const toProcess = LIMIT ? pending.slice(0, LIMIT) : pending;

  console.log(`Modelo: ${MODEL}`);
  console.log(`Leads atleevo:           ${leads.length}`);
  console.log(`Ya clasificados:         ${leads.length - pending.length}`);
  console.log(`Pendientes:              ${pending.length}`);
  console.log(`A procesar este run:     ${toProcess.length}  (batch=${BATCH})`);
  if (!toProcess.length) {
    console.log('\nNada que hacer.');
    if (APPLY) await writeDecisions(previous.results, leads);
    return;
  }

  let ok = 0, fail = 0;
  const t0 = Date.now();
  const results: Map<string, ResultRow> = new Map(previous.results.map((r) => [r.id, r]));

  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH);
    await Promise.all(batch.map(async (lead) => {
      try {
        const c = await callMiniMax(buildPrompt(lead));
        results.set(lead.id, { id: lead.id, nombre: lead.nombre, classification: c, classifiedAt: new Date().toISOString() });
        if (c) ok++; else fail++;
      } catch (e) {
        fail++;
        results.set(lead.id, { id: lead.id, nombre: lead.nombre, classification: null, error: (e as Error).message, classifiedAt: new Date().toISOString() });
      }
    }));
    // Guardar progreso tras cada batch
    writeFileSync(CLASSIF_FILE, JSON.stringify({ model: MODEL, total: results.size, results: Array.from(results.values()) }, null, 2));
    const done = Math.min(i + BATCH, toProcess.length);
    const elapsed = (Date.now() - t0) / 1000;
    const rate = done / elapsed;
    const eta = ((toProcess.length - done) / rate).toFixed(0);
    process.stdout.write(`  ${done}/${toProcess.length}  OK=${ok} FAIL=${fail}  ${rate.toFixed(1)}/s  ETA ${eta}s\r`);
    if (i + BATCH < toProcess.length) await new Promise((r) => setTimeout(r, 100));
  }
  console.log();

  console.log(`\nCompletado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`OK=${ok}  FAIL=${fail}`);

  // Stats
  const arr = Array.from(results.values());
  const byCat: Record<string, number> = {};
  for (const r of arr) {
    if (r.classification) byCat[r.classification.category] = (byCat[r.classification.category] ?? 0) + 1;
  }
  console.log('\nDistribución:');
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${v}`);
  }

  if (APPLY) await writeDecisions(arr, leads);
}

const CATEGORY_TO_ACTION: Record<Category, 'keep' | 'move-gym' | 'move-yoga' | 'move-box' | 'tag' | 'delete'> = {
  'pt-individual': 'keep',
  'gimnasio': 'move-gym',
  'crossfit-box': 'move-box',
  'yoga-pilates': 'move-yoga',
  'fisio': 'tag',
  'nutricion': 'tag',
  'clinica-medica': 'tag',
  'escuela': 'tag',
  'app-online': 'delete',
  'otro': 'tag',
};

async function writeDecisions(rows: ResultRow[], leads: Lead[]) {
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const decisions: { id: string; action: string; nombre: string; reason: string; confidence: string; category: string }[] = [];
  for (const r of rows) {
    if (!r.classification) continue;
    const lead = leadById.get(r.id);
    if (!lead) continue;
    const baseAction = CATEGORY_TO_ACTION[r.classification.category];
    if (baseAction === 'keep') continue;
    // Si confidence=baja, degradar move-* a tag (más conservador)
    const action = (r.classification.confidence === 'baja' && baseAction.startsWith('move-')) ? 'tag' : baseAction;
    decisions.push({
      id: r.id, action, nombre: r.nombre,
      category: r.classification.category,
      confidence: r.classification.confidence,
      reason: r.classification.reason,
    });
  }
  const out = join(OUT_DIR, 'atleevo-minimax-decisions.json');
  writeFileSync(out, JSON.stringify(decisions, null, 2));
  console.log(`\n${decisions.length} decisiones escritas en: ${out}`);
  const byAct: Record<string, number> = {};
  for (const d of decisions) byAct[d.action] = (byAct[d.action] ?? 0) + 1;
  console.log('Acciones propuestas:');
  for (const [k, v] of Object.entries(byAct)) console.log(`  ${k}: ${v}`);
  console.log('\nRevisa el JSON y luego, para aplicar a los JSON de leads:');
  console.log('  npx tsx scripts/apply-minimax-decisions.ts');
  console.log('Y después al BD:');
  console.log('  npx tsx scripts/sync-atleevo-json.ts --apply');
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
