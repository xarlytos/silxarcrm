/* ============================================================
   Árbol de Talentos — Diablo-style skill tree
============================================================ */

export type TalentRama = 'persuasion' | 'inteligencia' | 'velocidad' | 'imperio' | 'dragon';

export interface Talent {
  id: string;
  rama: TalentRama;
  tier: 1 | 2 | 3 | 4 | 5;
  nombre: string;
  desc: string;
  icono: string; // lucide
  /** ID del talento prerrequisito (mismo árbol, tier-1) */
  requires?: string;
  /** Nivel mínimo de jugador para desbloquear esta rama */
  minLevel?: number;
}

export const TALENTS: Talent[] = [
  // Persuasión (comunicación)
  { id: 'pers_1', rama: 'persuasion', tier: 1, nombre: 'Verbo Afilado',      desc: '+10% XP en comunicación (WA/Email/Llamadas)',           icono: 'MessageCircle' },
  { id: 'pers_2', rama: 'persuasion', tier: 2, nombre: 'Voz de Sirena',      desc: '+25% XP en comunicación',                                icono: 'Sparkles',  requires: 'pers_1' },
  { id: 'pers_3', rama: 'persuasion', tier: 3, nombre: 'Sello del Mago',     desc: 'WhatsApp da +10 gemas extra por reclamo',                icono: 'Crown',     requires: 'pers_2' },
  { id: 'pers_4', rama: 'persuasion', tier: 4, nombre: 'Lengua de Plata',    desc: '+50% XP en comunicación',                                icono: 'Mic',       requires: 'pers_3' },
  { id: 'pers_5', rama: 'persuasion', tier: 5, nombre: 'Encantador Supremo', desc: 'Comunicación da ×2 XP y ×2 gemas',                       icono: 'Wand2',     requires: 'pers_4' },
  // Inteligencia (gemas + crit + cofre)
  { id: 'int_1', rama: 'inteligencia', tier: 1, nombre: 'Ojo Avizor',         desc: '+20% gemas en TODAS las tareas',                         icono: 'Eye' },
  { id: 'int_2', rama: 'inteligencia', tier: 2, nombre: 'Cálculo Frío',       desc: '+10% chance de crítico en dailies',                      icono: 'Zap',       requires: 'int_1' },
  { id: 'int_3', rama: 'inteligencia', tier: 3, nombre: 'Ojo del Cofre',      desc: 'Los cofres dan +35% XP y gemas',                         icono: 'Gem',       requires: 'int_2' },
  { id: 'int_4', rama: 'inteligencia', tier: 4, nombre: 'Mente Cuántica',     desc: '+50% gemas globales',                                    icono: 'Atom',      requires: 'int_3' },
  { id: 'int_5', rama: 'inteligencia', tier: 5, nombre: 'Omnisciencia',       desc: '+25% chance de crítico en cualquier reclamo (no solo dailies)', icono: 'Sparkles', requires: 'int_4' },
  // Velocidad (dailies)
  { id: 'vel_1', rama: 'velocidad', tier: 1, nombre: 'Pasos Ligeros',         desc: '+1 daily quest extra (4 en vez de 3)',                   icono: 'Zap' },
  { id: 'vel_2', rama: 'velocidad', tier: 2, nombre: 'Aliento del Viento',    desc: '+30% XP en todas las dailies',                           icono: 'Wind',      requires: 'vel_1' },
  { id: 'vel_3', rama: 'velocidad', tier: 3, nombre: 'Doble Pulso',           desc: '25% chance de doblar XP en cualquier reclamo',           icono: 'Star',      requires: 'vel_2' },
  { id: 'vel_4', rama: 'velocidad', tier: 4, nombre: 'Tormenta',              desc: '+2 dailies extra (6 en total) y +20% XP weeklies',       icono: 'Snowflake', requires: 'vel_3' },
  { id: 'vel_5', rama: 'velocidad', tier: 5, nombre: 'Tiempo Detenido',       desc: 'Cofre se puede abrir 2 veces al día',                    icono: 'Rocket',    requires: 'vel_4' },
  // Imperio (oro) — disponible a partir de Lvl 15
  { id: 'imp_1', rama: 'imperio', tier: 1, nombre: 'Visión Imperial',         desc: '+5% XP general permanente',                              icono: 'Crown',     minLevel: 15 },
  { id: 'imp_2', rama: 'imperio', tier: 2, nombre: 'Tributo del Reino',       desc: '+10% gemas en propuestas y cierres',                     icono: 'Coins',     minLevel: 15, requires: 'imp_1' },
  { id: 'imp_3', rama: 'imperio', tier: 3, nombre: 'Mano de Hierro',          desc: '+15% XP general (sobre +5%)',                            icono: 'Hammer',    minLevel: 15, requires: 'imp_2' },
  { id: 'imp_4', rama: 'imperio', tier: 4, nombre: 'Edicto Soberano',         desc: '+30% gemas globales (acumulable con Inteligencia)',      icono: 'KeyRound',  minLevel: 15, requires: 'imp_3' },
  { id: 'imp_5', rama: 'imperio', tier: 5, nombre: 'Aura Imperial',           desc: '+25% XP general — la final del Imperio',                 icono: 'Diamond',   minLevel: 15, requires: 'imp_4' },
  // Dragón (rosa) — capstone, requiere Lvl 20
  { id: 'drg_1', rama: 'dragon', tier: 1, nombre: 'Sangre de Dragón',         desc: 'Críticos hacen ×3 (en vez de ×2)',                       icono: 'Flame',     minLevel: 20 },
  { id: 'drg_2', rama: 'dragon', tier: 2, nombre: 'Aliento de Fuego',         desc: 'Casino disponible también lunes y viernes',              icono: 'Flame',     minLevel: 20, requires: 'drg_1' },
  { id: 'drg_3', rama: 'dragon', tier: 3, nombre: 'Escamas Doradas',          desc: 'Cofre del día sube 1 tier extra',                        icono: 'Diamond',   minLevel: 20, requires: 'drg_2' },
  { id: 'drg_4', rama: 'dragon', tier: 4, nombre: 'Mirada del Wyrm',          desc: 'Tarot da +40% XP (en vez de +20%) cuando se cumple',     icono: 'Eye',       minLevel: 20, requires: 'drg_3' },
  { id: 'drg_5', rama: 'dragon', tier: 5, nombre: 'Avatar del Dragón',        desc: 'Todas las tareas de boss dan ×2 XP y gemas',             icono: 'Skull',     minLevel: 20, requires: 'drg_4' },
];

export const RAMA_INFO: Record<TalentRama, { label: string; color: string; bg: string; ring: string; line: string }> = {
  persuasion:   { label: 'Persuasión',   color: 'text-rose-400',    bg: 'from-rose-500/20 to-rose-600/10',     ring: 'ring-rose-400/40',    line: '#fb7185' },
  inteligencia: { label: 'Inteligencia', color: 'text-cyan-400',    bg: 'from-cyan-500/20 to-blue-600/10',     ring: 'ring-cyan-400/40',    line: '#22d3ee' },
  velocidad:    { label: 'Velocidad',    color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-600/10', ring: 'ring-emerald-400/40', line: '#34d399' },
  imperio:      { label: 'Imperio',      color: 'text-amber-400',   bg: 'from-amber-500/20 to-orange-600/10',  ring: 'ring-amber-400/40',   line: '#f59e0b' },
  dragon:       { label: 'Dragón',       color: 'text-fuchsia-400', bg: 'from-fuchsia-500/20 to-rose-700/10',  ring: 'ring-fuchsia-400/40', line: '#e879f9' },
};

export function canUnlockTalent(t: Talent, owned: Record<string, true>, points: number, playerLevel: number): boolean {
  if (owned[t.id]) return false;
  if (points <= 0) return false;
  if (t.requires && !owned[t.requires]) return false;
  if (t.minLevel && playerLevel < t.minLevel) return false;
  return true;
}
