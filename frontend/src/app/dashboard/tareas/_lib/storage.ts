import type { ChestReward } from './chest';

/* ============================================================
   Persistencia (localStorage)
============================================================ */

const STORAGE_KEY = 'crm_tareas_progreso_v2';

export interface Progress {
  totalXp: number;
  totalGemas: number;
  achievementsClaimed: Record<string, string>;
  dailiesClaimed: Record<string, string>;  // `${YYYY-MM-DD}_${id}`
  weekliesClaimed: Record<string, string>; // `${YYYY-Www}_${id}`
  bossesClaimed: Record<string, string>;   // `${YYYY-MM}_${id}`
  streak: { count: number; lastDay: string | null; best: number };
  firstVisit: string | null;
  /** Cofre abierto hoy (si existe), fecha + recompensa */
  lastChest: { date: string; reward: ChestReward } | null;
  /** IDs de capítulos de saga ya vistos */
  sagaRead: string[];
  /** Críticos totales acumulados (para récords) */
  critTotal: number;
  /** Tarot revelado hoy */
  tarotRevealed: { date: string; cardId: string } | null;
  /** Talentos desbloqueados */
  talents: Record<string, true>;
  /** Slots del fin de semana */
  slots: { week: string; spinsUsed: number; lastReward: { reels: string[]; xp: number; gemas: number; tipo: string } | null };
  /** Aureolas de prestige obtenidas por reencarnación (cada una = +10% XP global permanente) */
  aureolas: number;
  /** Lvl alcanzado máximo histórico (para récords) */
  bestLevelReached: number;
}

export const emptyProgress = (): Progress => ({
  totalXp: 0,
  totalGemas: 0,
  achievementsClaimed: {},
  dailiesClaimed: {},
  weekliesClaimed: {},
  bossesClaimed: {},
  streak: { count: 0, lastDay: null, best: 0 },
  firstVisit: null,
  lastChest: null,
  sagaRead: [],
  critTotal: 0,
  tarotRevealed: null,
  talents: {},
  slots: { week: '', spinsUsed: 0, lastReward: null },
  aureolas: 0,
  bestLevelReached: 1,
});

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...emptyProgress(), ...parsed };
    }
    // Migración desde v1
    const v1raw = localStorage.getItem('crm_tareas_progreso_v1');
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      const migrated: Progress = {
        ...emptyProgress(),
        totalXp: v1.totalXp ?? 0,
        achievementsClaimed: v1.achievementsClaimed ?? {},
        dailiesClaimed: v1.dailiesClaimed ?? {},
        streak: {
          count: v1.streak?.count ?? 0,
          lastDay: v1.streak?.lastDay ?? null,
          best: v1.streak?.count ?? 0,
        },
      };
      return migrated;
    }
    return emptyProgress();
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(p: Progress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
