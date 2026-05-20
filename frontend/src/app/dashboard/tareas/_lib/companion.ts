import { hashString } from './utils';

/* ============================================================
   Aliado Espiritual (Companion) — evoluciona con tu nivel
============================================================ */

export interface CompanionStage {
  minLevel: number;
  icon: string;
  name: string;
  desc: string;
  aura: string; // gradient classes
  iconColor: string; // tailwind text color
}

export const COMPANIONS: CompanionStage[] = [
  { minLevel: 1,   icon: 'Egg',       name: 'Huevito',     desc: 'Un pequeño huevo brilla suavemente, esperando despertar.', aura: 'from-slate-400/30 to-slate-500/20',                          iconColor: 'text-slate-300' },
  { minLevel: 3,   icon: 'Bird',      name: 'Chispa',      desc: '¡Ha eclosionado! Te mira con curiosidad eléctrica.',         aura: 'from-amber-400/40 to-yellow-500/20',                         iconColor: 'text-amber-300' },
  { minLevel: 6,   icon: 'Sparkles',  name: 'Aliento',     desc: 'Sus alas reflejan cada conversión que cierras.',             aura: 'from-emerald-400/40 to-cyan-500/30',                         iconColor: 'text-emerald-300' },
  { minLevel: 10,  icon: 'Bird',      name: 'Vigía',       desc: 'Vuela alto, vigilando el reino de tus leads.',               aura: 'from-blue-500/40 to-violet-500/30',                          iconColor: 'text-blue-300' },
  { minLevel: 16,  icon: 'Flame',     name: 'Sagrado',     desc: 'Un dragón ancestral te acompaña en cada llamada.',           aura: 'from-rose-500/40 via-fuchsia-500/30 to-amber-500/20',        iconColor: 'text-rose-300' },
  { minLevel: 25,  icon: 'Sun',       name: 'Avatar',      desc: 'Trasciende la forma. Es luz pura caminando contigo.',        aura: 'from-amber-400/50 via-fuchsia-400/40 to-cyan-400/30',        iconColor: 'text-amber-200' },
  { minLevel: 35,  icon: 'Crown',     name: 'Imperator',   desc: 'Lleva una corona de plasma sobre su cabeza.',                aura: 'from-amber-500/50 via-orange-500/40 to-yellow-300/40',       iconColor: 'text-amber-200' },
  { minLevel: 50,  icon: 'Star',      name: 'Estrella',    desc: 'Es una estrella en miniatura — su gravedad reordena tu CRM.', aura: 'from-yellow-400/60 via-amber-400/50 to-orange-500/30',       iconColor: 'text-yellow-200' },
  { minLevel: 65,  icon: 'Atom',      name: 'Núcleo',      desc: 'Una partícula primordial pulsa contigo a cada latido.',      aura: 'from-fuchsia-500/50 via-violet-500/40 to-blue-500/40',       iconColor: 'text-fuchsia-200' },
  { minLevel: 80,  icon: 'Hexagon',   name: 'Geométrico',  desc: 'Adopta forma de geometría sagrada. Imposible de ignorar.',   aura: 'from-cyan-400/60 via-emerald-400/40 to-fuchsia-400/40',      iconColor: 'text-cyan-200' },
  { minLevel: 90,  icon: 'Diamond',   name: 'Cristal',     desc: 'Un cristal multifacético que refleja todo tu camino.',       aura: 'from-cyan-300/60 via-fuchsia-300/50 to-amber-300/40',        iconColor: 'text-cyan-100' },
  { minLevel: 100, icon: 'Sparkles',  name: 'Trascendido', desc: 'Ya no tiene forma. Es la idea misma del progreso.',          aura: 'from-amber-300/70 via-rose-300/60 via-violet-300/50 to-cyan-300/40', iconColor: 'text-amber-100' },
];

export function getCompanion(level: number): CompanionStage {
  let stage = COMPANIONS[0];
  for (const s of COMPANIONS) if (level >= s.minLevel) stage = s;
  return stage;
}

export const COMPANION_TIPS: string[] = [
  'Cada llamada es una nueva historia que escribes.',
  'Una plantilla bien pulida vale por mil envíos torpes.',
  'El silencio del cliente no es un no — es un compás.',
  'Cinco minutos de prospección al día construyen imperios.',
  'Las palabras del primer mensaje deciden la sinfonía.',
  'Un follow-up amable es un puente, no una presión.',
  'Los leads viejos a veces son tesoros que olvidaste excavar.',
  'Cierra el día sin un envío y mañana pesará el doble.',
  'Tu mejor plantilla la escribirás tras cien malas.',
  'La constancia gana siempre. La intensidad solo a veces.',
  'Un email leído vale por diez ignorados — afila el asunto.',
  'Las objeciones son mapas: te dicen dónde está el tesoro.',
];

export function tipOfTheDay(seed: string): string {
  return COMPANION_TIPS[hashString(seed) % COMPANION_TIPS.length];
}
