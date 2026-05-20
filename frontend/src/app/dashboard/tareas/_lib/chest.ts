/* ============================================================
   Cofre del Día — tier según racha
============================================================ */

export interface ChestTier {
  minStreak: number;
  name: string;
  icon: string; // lucide name
  iconColor: string;
  color: string;
  xpMin: number; xpMax: number;
  gemMin: number; gemMax: number;
  critChance: number; // chance de bonus mega
}

export const CHEST_TIERS: ChestTier[] = [
  { minStreak: 0,  name: 'Cofre de Madera', icon: 'Package', iconColor: 'text-amber-700',  color: 'from-amber-900/30 to-yellow-900/20',                    xpMin: 30,  xpMax: 100,  gemMin: 5,   gemMax: 20,  critChance: 0.05 },
  { minStreak: 3,  name: 'Cofre de Bronce', icon: 'Gift',    iconColor: 'text-orange-400', color: 'from-orange-700/40 to-amber-700/30',                    xpMin: 100, xpMax: 250,  gemMin: 20,  gemMax: 50,  critChance: 0.10 },
  { minStreak: 7,  name: 'Cofre de Plata',  icon: 'Gem',     iconColor: 'text-cyan-300',   color: 'from-slate-400/40 to-cyan-500/30',                      xpMin: 250, xpMax: 600,  gemMin: 50,  gemMax: 120, critChance: 0.20 },
  { minStreak: 14, name: 'Cofre de Oro',    icon: 'Crown',   iconColor: 'text-amber-300',  color: 'from-amber-400/50 via-fuchsia-500/30 to-rose-500/30',   xpMin: 600, xpMax: 1500, gemMin: 120, gemMax: 300, critChance: 0.35 },
];

export function getChestTier(streak: number): ChestTier {
  let tier = CHEST_TIERS[0];
  for (const t of CHEST_TIERS) if (streak >= t.minStreak) tier = t;
  return tier;
}

export interface ChestReward {
  xp: number;
  gemas: number;
  crit: boolean;
  tier: string;
}

export function rollChestReward(tier: ChestTier): ChestReward {
  const r = Math.random();
  const isCrit = r < tier.critChance;
  const xp = Math.round(tier.xpMin + Math.random() * (tier.xpMax - tier.xpMin)) * (isCrit ? 2 : 1);
  const gemas = Math.round(tier.gemMin + Math.random() * (tier.gemMax - tier.gemMin)) * (isCrit ? 2 : 1);
  return { xp, gemas, crit: isCrit, tier: tier.name };
}
