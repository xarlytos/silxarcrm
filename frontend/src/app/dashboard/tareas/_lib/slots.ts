/* ============================================================
   Casino del Fin de Semana — slot machine sáb/dom
============================================================ */

export interface SlotSymbol {
  id: string;
  icon: string; // lucide name
  color: string;
  /** Peso para la generación aleatoria (más alto = más común) */
  weight: number;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'cherry', icon: 'Cherry', color: 'text-rose-400',    weight: 30 },
  { id: 'lemon',  icon: 'Citrus', color: 'text-yellow-400',  weight: 28 },
  { id: 'star',   icon: 'Star',   color: 'text-amber-400',   weight: 20 },
  { id: 'gem',    icon: 'Gem',    color: 'text-cyan-400',    weight: 12 },
  { id: 'crown',  icon: 'Crown',  color: 'text-fuchsia-400', weight: 7 },
  { id: 'dragon', icon: 'Flame',  color: 'text-rose-500',    weight: 3 },
];

export function spinSlot(): { reels: SlotSymbol[]; reward: { xp: number; gemas: number; tipo: string } } {
  const totalW = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);
  const pick = (): SlotSymbol => {
    let r = Math.random() * totalW;
    for (const s of SLOT_SYMBOLS) { if (r < s.weight) return s; r -= s.weight; }
    return SLOT_SYMBOLS[0];
  };
  const reels = [pick(), pick(), pick()];
  // Premios
  const allSame = reels[0].id === reels[1].id && reels[1].id === reels[2].id;
  const twoSame = !allSame && (reels[0].id === reels[1].id || reels[1].id === reels[2].id || reels[0].id === reels[2].id);
  let xp = 0, gemas = 0, tipo = 'nada';
  if (allSame) {
    // Jackpot — multiplicado por rareza del símbolo
    const w = reels[0].weight;
    if (w >= 28) { xp = 200; gemas = 30; tipo = 'jackpot_basico'; }
    else if (w >= 20) { xp = 500; gemas = 70; tipo = 'jackpot_medio'; }
    else if (w >= 12) { xp = 1200; gemas = 200; tipo = 'jackpot_alto'; }
    else if (w >= 7) { xp = 3000; gemas = 500; tipo = 'jackpot_epico'; }
    else { xp = 8000; gemas = 1500; tipo = 'JACKPOT_DRAGON'; }
  } else if (twoSame) {
    xp = 80; gemas = 12; tipo = 'doble';
  } else {
    xp = 10; gemas = 2; tipo = 'consuelo';
  }
  return { reels, reward: { xp, gemas, tipo } };
}

export function isWeekend(): boolean {
  const d = new Date().getDay();
  return d === 0 || d === 6; // dom = 0, sáb = 6
}
