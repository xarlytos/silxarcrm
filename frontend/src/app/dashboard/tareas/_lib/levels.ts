/* ============================================================
   Sistema de XP, niveles, títulos, buff de racha
============================================================ */

export const xpForLevel = (level: number) => (level - 1) ** 2 * 100;

export function deriveLevel(totalXp: number) {
  const lvl = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const currentLevelXp = xpForLevel(lvl);
  const nextLevelXp = xpForLevel(lvl + 1);
  const xpInLevel = totalXp - currentLevelXp;
  const xpForNext = nextLevelXp - currentLevelXp;
  return { level: lvl, xpInLevel, xpForNext, progress: xpInLevel / xpForNext };
}

export const LEVEL_TITLES: { min: number; title: string; color: string }[] = [
  { min: 1,   title: 'Aprendiz',          color: 'text-slate-400' },
  { min: 3,   title: 'Marketer Junior',   color: 'text-emerald-400' },
  { min: 5,   title: 'Cazador de Leads',  color: 'text-blue-400' },
  { min: 7,   title: 'Marketing Maestro', color: 'text-violet-400' },
  { min: 10,  title: 'Estratega',         color: 'text-fuchsia-400' },
  { min: 13,  title: 'Gran Maestro',      color: 'text-amber-400' },
  { min: 17,  title: 'Leyenda',           color: 'text-orange-400' },
  { min: 22,  title: 'Inmortal',          color: 'text-rose-400' },
  { min: 30,  title: 'Avatar Supremo',    color: 'text-fuchsia-300' },
  { min: 40,  title: 'Imperador',         color: 'text-amber-300' },
  { min: 50,  title: 'Soberano',          color: 'text-pink-300' },
  { min: 60,  title: 'Arquitecto del Reino', color: 'text-cyan-300' },
  { min: 70,  title: 'Magnate',           color: 'text-emerald-300' },
  { min: 80,  title: 'Demiurgo',          color: 'text-violet-300' },
  { min: 90,  title: 'Cosmocrator',       color: 'text-indigo-300' },
  { min: 100, title: 'Trascendido',       color: 'text-amber-200' },
];
export function getTitleInfo(level: number) {
  let info = LEVEL_TITLES[0];
  for (const t of LEVEL_TITLES) if (level >= t.min) info = t;
  return info;
}

export interface StreakBuff {
  level: 0 | 1 | 2 | 3;
  name: string;
  desc: string;
  bonusPct: number;
  color: string;
}
export function getStreakBuff(streak: number): StreakBuff {
  if (streak >= 14) return { level: 3, name: 'Aura del Veterano', desc: '+30% XP en misiones diarias', bonusPct: 30, color: 'from-rose-500 to-amber-500' };
  if (streak >= 7) return { level: 2, name: 'Llama Constante', desc: '+20% XP en misiones diarias', bonusPct: 20, color: 'from-orange-500 to-rose-500' };
  if (streak >= 3) return { level: 1, name: 'Brisa Cálida', desc: '+10% XP en misiones diarias', bonusPct: 10, color: 'from-amber-500 to-orange-500' };
  return { level: 0, name: 'Sin buff', desc: 'Consigue una racha de 3 días', bonusPct: 0, color: 'from-slate-500 to-slate-600' };
}
