/**
 * Aplica decisiones manuales sobre los 4 JSON de atleevo*.
 * Cada decisión: { id, action } donde action ∈ untag, tag, move-gym, move-yoga, move-box, delete.
 *
 * Las decisiones están embebidas abajo (lista revisada a mano lead por lead).
 * Modifica solo los JSON; luego hay que correr sync-atleevo-json.ts --apply.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT_DIR = join(__dirname, 'output', 'atleevo-leads');
const TAG_REVIEW = 'revisar-manualmente';

type Action = 'untag' | 'tag' | 'move-gym' | 'move-yoga' | 'move-box' | 'delete';
type Decision = { id: string; action: Action; nombre: string };

const DECISIONS: Decision[] = [
  // === UNTAG: centros PT mal etiquetados (nombre tiene fisio/nutri pero son PT centers) ===
  { id: 'cmpcyjpb2000rih9u1ornnuui', action: 'untag', nombre: 'QURE - Entrenamiento personal y Fisioterapia' },
  { id: 'cmpcyjttr0018ih9uq0pp2tau', action: 'untag', nombre: 'ONFIT89 MADRID' },
  { id: 'cmpcyk709002hih9uvargus7n', action: 'untag', nombre: 'GOALS Fisioterapia y Personal Training' },
  { id: 'cmpcyk9xv002sih9uws0hthrz', action: 'untag', nombre: 'Entrenador Personal & Fisioterapia' },
  { id: 'cmpcykd2v0034ih9ulebfjyze', action: 'untag', nombre: 'Wetrain Barcelona' },
  { id: 'cmpcyko4f0044ih9u9obupw3n', action: 'untag', nombre: 'Sergio Cortell Entrenamiento y Nutrición' },
  { id: 'cmpcykww9004vih9u5ts3dshv', action: 'untag', nombre: 'JT TRAINER HEALTH CLUB' },
  { id: 'cmpcykzzl0057ih9uek8bghv8', action: 'untag', nombre: 'Personal Fit Sevilla' },
  { id: 'cmpcyl133005bih9u7oxoufnb', action: 'untag', nombre: 'TwinFit Sevilla' },
  { id: 'cmpcyl8490062ih9uienbf51a', action: 'untag', nombre: 'Entrenamiento personal y clínica Credus' },
  { id: 'cmpcylfi8006mih9utg5964o1', action: 'untag', nombre: 'MiHoraFit' },
  { id: 'cmpcylg24006oih9up0gcloz4', action: 'untag', nombre: 'JG fitness Actur' },
  { id: 'cmpczfcsq00bvq1sezcv83630', action: 'untag', nombre: 'Sano Goodlife Torre del agua Córdoba' },

  // === TAG: outliers que no se me detectaron antes (escuelas, oposiciones, instructor de tiro, etc.) ===
  { id: 'cmpcz2r6u001hq1sephg3fs2i', action: 'tag', nombre: 'Instituto ISAF' },
  { id: 'cmpcz3z0c0039q1sepbdzkvni', action: 'tag', nombre: 'Oposiciones Educación Física Luis Timón' },
  { id: 'cmpcz50d10049q1seey3k0hqp', action: 'tag', nombre: 'Fivestars International Graduate School' },
  { id: 'cmpczg1zz00dpq1se14es7z97', action: 'tag', nombre: 'Aerobics Center - Instituto de Formación' },
  { id: 'cmpczfvv000deq1sehvg6nk2y', action: 'tag', nombre: 'Instructor de Tiro' },
  { id: 'cmpczjj4600l3q1seavtc252c', action: 'tag', nombre: 'Santano Sport Nutrition' },
  { id: 'cmpcyl6uq005xih9usccrznxi', action: 'tag', nombre: 'BODYCLUB' },

  // === MOVE → atleevogym: clubs de fuerza/bodybuilding ===
  { id: 'cmpcykbrt002zih9ue5x8wzve', action: 'move-gym', nombre: 'Barcelona Barbell Club' },
  { id: 'cmpczi61v00ikq1seho3twhy6', action: 'move-gym', nombre: 'Hardbody Club' },
  { id: 'cmpczaqvk008bq1sewzbcdors', action: 'move-gym', nombre: 'The Place By Pablo Almeida' },

  // === MOVE → atleevobox: cross training / box ===
  { id: 'cmpcyl6lq005wih9ukbna7c5u', action: 'move-box', nombre: 'ACR CROSS TRAINING 100% Functional' },

  // === Tenerife review (lista revisada por usuario 2026-05-19) ===
  { id: 'cmpczmt7v00rkq1se2k1k5iln', action: 'move-gym', nombre: 'RED Recuperacion Entrenamiento Deportivo' },
  { id: 'cmpczlz5s00pyq1seztl858tx', action: 'move-gym', nombre: 'Smart Motion Tenerife - Centro Entrenamiento y Recuperación' },
  { id: 'cmpczmsd500riq1seoq6rikp9', action: 'tag', nombre: 'Rudefit' },
  { id: 'cmpczmlah00rbq1seu10e8530', action: 'tag', nombre: 'Entrenamiento y Recuperación' },
  { id: 'cmpczm7n100qsq1sedkxm60nf', action: 'tag', nombre: 'efficienTraining Botánico Center' },
  { id: 'cmpczm7d600qrq1se0kxgtnmn', action: 'tag', nombre: 'KAI Centro de Entrenamiento' },
];

function load(file: string): any[] {
  return JSON.parse(readFileSync(join(OUT_DIR, file), 'utf8'));
}
function save(file: string, data: any[]) {
  writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  const atleevo = load('atleevo.json');
  const gym = load('atleevogym.json');
  const yoga = load('atleevoyoga.json');
  const box = load('atleevobox.json');

  const byId = new Map(atleevo.map((l: any) => [l.id, l]));
  const counts: Record<Action, number> = { untag: 0, tag: 0, 'move-gym': 0, 'move-yoga': 0, 'move-box': 0, delete: 0 };
  const errors: string[] = [];

  for (const d of DECISIONS) {
    const l = byId.get(d.id);
    if (!l) { errors.push(`NOT FOUND in atleevo.json: ${d.id} (${d.nombre})`); continue; }

    if (d.action === 'untag') {
      l.etiquetas = (l.etiquetas || []).filter((t: string) => t !== TAG_REVIEW);
      counts.untag++;
    } else if (d.action === 'tag') {
      if (!l.etiquetas.includes(TAG_REVIEW)) l.etiquetas.push(TAG_REVIEW);
      counts.tag++;
    } else if (d.action === 'delete') {
      byId.delete(d.id);
      counts.delete++;
    } else if (d.action.startsWith('move-')) {
      const target = d.action === 'move-gym' ? 'atleevogym' : d.action === 'move-yoga' ? 'atleevoyoga' : 'atleevobox';
      const targetArr = target === 'atleevogym' ? gym : target === 'atleevoyoga' ? yoga : box;
      // Quitar el tag al mover (ya no aplica revisar)
      l.etiquetas = (l.etiquetas || []).filter((t: string) => t !== TAG_REVIEW);
      l.softwareId = target;
      targetArr.push(l);
      byId.delete(d.id);
      counts[d.action]++;
    }
  }

  const newAtleevo = Array.from(byId.values());
  save('atleevo.json', newAtleevo);
  save('atleevogym.json', gym);
  save('atleevoyoga.json', yoga);
  save('atleevobox.json', box);

  console.log('Decisiones aplicadas:');
  for (const [k, v] of Object.entries(counts) as [Action, number][]) if (v) console.log(`  ${k}: ${v}`);
  console.log(`\natleevo.json: ${atleevo.length} -> ${newAtleevo.length}`);
  console.log(`atleevogym.json: -> ${gym.length}`);
  console.log(`atleevoyoga.json: -> ${yoga.length}`);
  console.log(`atleevobox.json: -> ${box.length}`);
  if (errors.length) {
    console.log(`\nERRORES: ${errors.length}`);
    errors.forEach((e) => console.log(`  ${e}`));
  }
}

main();
