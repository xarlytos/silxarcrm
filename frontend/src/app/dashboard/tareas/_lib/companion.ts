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
  image: string; // path to mascot image
}

export const COMPANIONS: CompanionStage[] = [
  { minLevel: 1,   icon: 'Egg',       name: 'Yema',        desc: 'El germen de todo. Brilla suavemente, esperando su momento.', aura: 'from-slate-400/30 to-slate-500/20',                          iconColor: 'text-slate-300', image: '/mascotas/1.png' },
  { minLevel: 3,   icon: 'Bird',      name: 'Byte',        desc: 'Una chispa digital recién nacida. Curiosa, rápida, implacable.', aura: 'from-amber-400/40 to-yellow-500/20',                         iconColor: 'text-amber-300', image: '/mascotas/2.png' },
  { minLevel: 6,   icon: 'Sparkles',  name: 'Céfiro',      desc: 'La brisa que trae conversions. Cada cierre alimenta sus alas.', aura: 'from-emerald-400/40 to-cyan-500/30',                         iconColor: 'text-emerald-300', image: '/mascotas/3.png' },
  { minLevel: 10,  icon: 'Bird',      name: 'Iris',        desc: 'El ojo que todo lo ve. Ningún lead se escapa de su mirada.', aura: 'from-blue-500/40 to-violet-500/30',                          iconColor: 'text-blue-300', image: '/mascotas/4.png' },
  { minLevel: 16,  icon: 'Flame',     name: 'Closer',      desc: 'Dragón de las llamadas cerradas. Donde arde, el deal se firma.', aura: 'from-rose-500/40 via-fuchsia-500/30 to-amber-500/20',        iconColor: 'text-rose-300', image: '/mascotas/5.png' },
  { minLevel: 25,  icon: 'Sun',       name: 'Aureola',     desc: 'Luz pura que trasciende. Tu primera recompensa eterna.',     aura: 'from-amber-400/50 via-fuchsia-400/40 to-cyan-400/30',        iconColor: 'text-amber-200', image: '/mascotas/6.png' },
  { minLevel: 35,  icon: 'Crown',     name: 'Magnus',      desc: 'El grande. Su corona de plasma doblega propuestas rebeldes.', aura: 'from-amber-500/50 via-orange-500/40 to-yellow-300/40',       iconColor: 'text-amber-200', image: '/mascotas/7.png' },
  { minLevel: 50,  icon: 'Star',      name: 'Nova',        desc: 'Explosión estelar en miniatura. Su brillo reorganiza el CRM.', aura: 'from-yellow-400/60 via-amber-400/50 to-orange-500/30',       iconColor: 'text-yellow-200', image: '/mascotas/8.png' },
  { minLevel: 65,  icon: 'Atom',      name: 'Quark',       desc: 'Tan pequeño que casi no existe. Tan potente que lo mueve todo.', aura: 'from-fuchsia-500/50 via-violet-500/40 to-blue-500/40',       iconColor: 'text-fuchsia-200', image: '/mascotas/9.png' },
  { minLevel: 80,  icon: 'Hexagon',   name: 'Fractal',     desc: 'Geometría sagrada sin fin. Cada patrón predice tu siguiente venta.', aura: 'from-cyan-400/60 via-emerald-400/40 to-fuchsia-400/40',      iconColor: 'text-cyan-200', image: '/mascotas/10.png' },
  { minLevel: 90,  icon: 'Diamond',   name: 'Prisma',      desc: 'Mil facetas, mil caminos recorridos. Cada una brilla con una victoria.', aura: 'from-cyan-300/60 via-fuchsia-300/50 to-amber-300/40',        iconColor: 'text-cyan-100', image: '/mascotas/11.png' },
  { minLevel: 100, icon: 'Sparkles',  name: 'Logos',       desc: 'La Palabra original. Ya no tiene forma porque eres tú quien la da.', aura: 'from-amber-300/70 via-rose-300/60 via-violet-300/50 to-cyan-300/40', iconColor: 'text-amber-100', image: '/mascotas/12.png' },
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
