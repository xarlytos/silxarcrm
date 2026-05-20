import { hashString } from './utils';

/* ============================================================
   Evento del Día — rotan por fecha, dan buffs visuales/numéricos
============================================================ */

export interface DailyEvent {
  id: string;
  titulo: string;
  desc: string;
  icono: string; // lucide name
  color: string; // tailwind color base
  effects: {
    gemMult?: number;
    xpMultBySource?: Record<string, number>; // source key → multiplier
  };
}

export const DAILY_EVENTS: DailyEvent[] = [
  {
    id: 'cazador', titulo: 'Día del Cazador',
    desc: 'Las dailies de leads dan +30% XP',
    icono: 'Target', color: 'blue',
    effects: { xpMultBySource: { leadsHoy: 1.3 } },
  },
  {
    id: 'lluvia_gemas', titulo: 'Lluvia de Gemas',
    desc: 'Todas las tareas dan +50% gemas',
    icono: 'Gem', color: 'cyan',
    effects: { gemMult: 1.5 },
  },
  {
    id: 'hora_pico', titulo: 'Hora Pico',
    desc: 'Las llamadas dan el doble de XP',
    icono: 'Phone', color: 'rose',
    effects: { xpMultBySource: { llamadasHoy: 2 } },
  },
  {
    id: 'maraton_email', titulo: 'Maratón Email',
    desc: 'Las dailies de email dan +50% XP',
    icono: 'Mail', color: 'fuchsia',
    effects: { xpMultBySource: { emailEnviosHoy: 1.5 } },
  },
  {
    id: 'templo_closer', titulo: 'Templo del Closer',
    desc: 'Las conversiones dan +75% XP',
    icono: 'Trophy', color: 'amber',
    effects: { xpMultBySource: { leadsConvertidos: 1.75, conversionesSemana: 1.75, conversionesMes: 1.75 } },
  },
  {
    id: 'manos_veloces', titulo: 'Manos Veloces',
    desc: 'WhatsApp da +40% XP en todas las tareas',
    icono: 'Zap', color: 'amber',
    effects: { xpMultBySource: { whatsappEnviosHoy: 1.4, whatsappEnviosSemana: 1.4, whatsappEnviosTotal: 1.4 } },
  },
  {
    id: 'festival_plantillas', titulo: 'Festival de Plantillas',
    desc: 'Crear plantillas vale +60% XP',
    icono: 'FileText', color: 'emerald',
    effects: { xpMultBySource: { whatsappPlantillas: 1.6, emailPlantillas: 1.6 } },
  },
  {
    id: 'sabiduria', titulo: 'Sabiduría Antigua',
    desc: 'Todas las tareas dan +15% XP',
    icono: 'Sparkles', color: 'violet',
    effects: { xpMultBySource: {} }, // applied as global below
  },
  {
    id: 'dia_calmo', titulo: 'Día Calmo',
    desc: 'Sin buff especial — pero un día tranquilo es un regalo',
    icono: 'Shield', color: 'slate',
    effects: {},
  },
  {
    id: 'cosmico', titulo: 'Alineación Cósmica',
    desc: 'Las constelaciones se alinean: +25% gemas y +25% XP en dailies',
    icono: 'Star', color: 'fuchsia',
    effects: {
      gemMult: 1.25,
      xpMultBySource: { whatsappEnviosHoy: 1.25, llamadasHoy: 1.25, leadsHoy: 1.25, emailEnviosHoy: 1.25, eventosHoy: 1.25, propuestasHoy: 1.25 },
    },
  },
  { id: 'dorado',     titulo: 'Día Dorado',         desc: '+50% XP en conversiones y propuestas aceptadas', icono: 'Coins',    color: 'amber',   effects: { xpMultBySource: { leadsConvertidos: 1.5, propuestasAceptadas: 1.5, conversionesHoy: 1.5 } } },
  { id: 'lluvia_oro', titulo: 'Lluvia de Oro',      desc: 'Ingresos dan +100% XP en sus tareas',           icono: 'Banknote', color: 'amber',   effects: { xpMultBySource: { ingresosHoy: 2, propuestasAceptadasMes: 2, propuestasAceptadasSemana: 2 } } },
  { id: 'fin_semana', titulo: 'Fin de Semana Real', desc: 'Las weeklies dan +30% XP hoy',                  icono: 'Calendar', color: 'violet',  effects: {} },
  { id: 'noche_estrellas', titulo: 'Noche de las Estrellas', desc: '+20% gemas y +25% XP en logros',       icono: 'Sparkles', color: 'fuchsia', effects: { gemMult: 1.2, xpMultBySource: {} } },
  { id: 'fiesta_pueblo', titulo: 'Fiesta del Pueblo', desc: 'Cofre del día sube 1 tier hoy',                icono: 'Gift',     color: 'amber',   effects: {} },
  { id: 'duelo',      titulo: 'Duelo de Maestros',  desc: 'Bosses dan +50% XP hoy',                        icono: 'Sword',    color: 'rose',    effects: {} },
  { id: 'iluminacion',titulo: 'Día de la Iluminación', desc: 'Talentos imperio activos cuentan doble (visualmente)', icono: 'Crown', color: 'amber', effects: {} },
  { id: 'eclipse',    titulo: 'Eclipse',            desc: 'Crítico chance doblado hoy',                    icono: 'Moon',     color: 'violet',  effects: {} },
  { id: 'cielo_claro',titulo: 'Cielo Claro',        desc: '+10% en todo (XP y gemas)',                     icono: 'Sun',      color: 'cyan',    effects: { gemMult: 1.1, xpMultBySource: { whatsappEnviosHoy: 1.1, llamadasHoy: 1.1, leadsHoy: 1.1, emailEnviosHoy: 1.1, eventosHoy: 1.1, propuestasHoy: 1.1, conversionesHoy: 1.1 } } },
];

export function getTodayEvent(today: string): DailyEvent {
  return DAILY_EVENTS[hashString(today) % DAILY_EVENTS.length];
}
