import type { TareaDef } from './types';
import { hashString } from './utils';

/* ============================================================
   Tarot Diario del Marketer — 22 cartas arcanas
============================================================ */

export interface TarotCard {
  id: string;
  num: string; // roman
  nombre: string;
  prediccion: string;
  hue: string; // tailwind gradient classes
  icon: string; // lucide name
}

export const TAROT_CARDS: TarotCard[] = [
  { id: 'profeta',      num: 'I',     nombre: 'El Profeta',         prediccion: 'Tu mensaje será leído. Envía con confianza — la audiencia ya está esperándote.', hue: 'from-amber-700/40 to-orange-800/40',                                  icon: 'Sun' },
  { id: 'torre_inv',    num: 'II',    nombre: 'La Torre Inversa',   prediccion: 'Cuidado con los leads viejos: la prisa rompe puentes. Hoy ve despacio.',          hue: 'from-rose-800/40 to-red-900/40',                                      icon: 'AlertTriangle' },
  { id: 'heraldo',      num: 'III',   nombre: 'El Heraldo',         prediccion: 'Una llamada entrante cambiará tu día. Mantén el teléfono cerca.',                hue: 'from-blue-700/40 to-indigo-800/40',                                   icon: 'Mail' },
  { id: 'hoja_vacia',   num: 'IV',    nombre: 'La Hoja Vacía',      prediccion: 'Hoy crea una plantilla. Te servirá durante meses como espada de oro.',           hue: 'from-slate-600/40 to-stone-800/40',                                   icon: 'Pencil' },
  { id: 'closer',       num: 'V',     nombre: 'El Closer',          prediccion: 'Cierra el trato que te ha estado esperando. El destino ya está escrito.',         hue: 'from-emerald-700/40 to-teal-800/40',                                  icon: 'Trophy' },
  { id: 'estrella_err', num: 'VI',    nombre: 'La Estrella Errante',prediccion: 'Un lead inesperado tocará la puerta. No lo dejes pasar.',                          hue: 'from-violet-700/40 to-fuchsia-800/40',                                icon: 'Sparkles' },
  { id: 'eco',          num: 'VII',   nombre: 'El Eco',             prediccion: 'Un follow-up viejo dará fruto. Revisa los olvidados de hace 30 días.',           hue: 'from-cyan-700/40 to-blue-800/40',                                     icon: 'Repeat' },
  { id: 'espada',       num: 'VIII',  nombre: 'La Espada',          prediccion: 'Hoy decide rápido. La duda mata más oportunidades que el error.',                 hue: 'from-red-800/40 to-rose-900/40',                                      icon: 'Sword' },
  { id: 'espejo',       num: 'IX',    nombre: 'El Espejo',          prediccion: 'Revisa tu mejor plantilla. Mejórala. Cada palabra cuenta.',                       hue: 'from-purple-700/40 to-slate-800/40',                                  icon: 'Eye' },
  { id: 'lazo',         num: 'X',     nombre: 'El Lazo Dorado',     prediccion: 'Un cliente convertido necesita atención. Un detalle de hoy = referido mañana.',  hue: 'from-amber-600/40 to-yellow-800/40',                                  icon: 'Infinity' },
  { id: 'pluma',        num: 'XI',    nombre: 'La Pluma',           prediccion: 'Escribe. Tu próximo email definirá el trimestre.',                                hue: 'from-indigo-700/40 to-violet-800/40',                                 icon: 'Feather' },
  { id: 'llama',        num: 'XII',   nombre: 'La Llama',           prediccion: 'Las llamadas tendrán fuego hoy. Habla con pasión, escucha con calma.',           hue: 'from-orange-700/40 to-red-800/40',                                    icon: 'Flame' },
  { id: 'velo',         num: 'XIII',  nombre: 'El Velo',            prediccion: 'Algo invisible se mueve. Confía en tu intuición — los datos llegan tarde.',      hue: 'from-fuchsia-700/40 to-purple-800/40',                                icon: 'Moon' },
  { id: 'camino',       num: 'XIV',   nombre: 'El Camino',          prediccion: 'Sigue la rutina. La constancia vence al genio en distancias largas.',            hue: 'from-emerald-700/40 to-green-800/40',                                 icon: 'Compass' },
  { id: 'cosecha',      num: 'XV',    nombre: 'La Cosecha',         prediccion: 'Hoy recoges lo que sembraste hace 30 días. Mira las conversiones recientes.',    hue: 'from-yellow-700/40 to-amber-800/40',                                  icon: 'Flower2' },
  { id: 'baculo',       num: 'XVI',   nombre: 'El Báculo',          prediccion: 'Apoya a tu equipo. Tu fuerza es colectiva, no individual.',                       hue: 'from-stone-600/40 to-zinc-800/40',                                    icon: 'Anchor' },
  { id: 'sol_negro',    num: 'XVII',  nombre: 'El Sol Negro',       prediccion: 'Día denso. Persiste — vendrá luz al cerrar la jornada.',                          hue: 'from-zinc-700/40 to-slate-900/40',                                    icon: 'CircleDashed' },
  { id: 'esfera',       num: 'XVIII', nombre: 'La Esfera',          prediccion: 'Tu próximo deal será cíclico. Acompaña sin presionar.',                           hue: 'from-blue-600/40 to-indigo-700/40',                                   icon: 'Globe' },
  { id: 'pacto',        num: 'XIX',   nombre: 'El Pacto',           prediccion: 'Hoy se firma. Prepara la propuesta limpia y los términos claros.',                hue: 'from-amber-700/40 to-orange-700/40',                                  icon: 'Handshake' },
  { id: 'risa',         num: 'XX',    nombre: 'La Risa',            prediccion: 'Bromea con tu lead. La calidez vende donde la presión cierra puertas.',          hue: 'from-pink-700/40 to-rose-800/40',                                     icon: 'Smile' },
  { id: 'hilo_oro',     num: 'XXI',   nombre: 'El Hilo de Oro',     prediccion: 'Sigue la pista del lead más caliente. El olfato tiene razón hoy.',                hue: 'from-amber-500/40 via-yellow-600/40 to-orange-700/40',                icon: 'Wand2' },
  { id: 'despertar',    num: 'XXII',  nombre: 'El Despertar',       prediccion: 'Despierta a un lead dormido. La paciencia se convierte en oro.',                  hue: 'from-cyan-600/40 via-blue-700/40 to-violet-800/40',                   icon: 'Sunrise' },
  { id: 'monedas',      num: 'XXIII', nombre: 'Las Monedas',        prediccion: 'Hoy hay oro flotando en la conversación. Pregunta por el presupuesto.',          hue: 'from-yellow-600/40 to-amber-800/40',                                  icon: 'Coins' },
  { id: 'cofre',        num: 'XXIV',  nombre: 'El Cofre Oculto',    prediccion: 'Una propuesta cerrada multiplicará a otras 3. Sigue empujando.',                 hue: 'from-amber-700/40 to-orange-800/40',                                  icon: 'PiggyBank' },
  { id: 'diamante',     num: 'XXV',   nombre: 'El Diamante',        prediccion: 'Aparece un cliente premium. Reserva tiempo para él, vale por diez.',             hue: 'from-cyan-500/40 via-fuchsia-500/30 to-amber-500/40',                 icon: 'Diamond' },
  { id: 'reloj',        num: 'XXVI',  nombre: 'El Reloj',           prediccion: 'El timing es todo hoy. Llama antes de las 11:00 o se enfría.',                   hue: 'from-stone-600/40 to-zinc-800/40',                                    icon: 'Repeat' },
  { id: 'mascara',      num: 'XXVII', nombre: 'La Máscara',         prediccion: 'No todo lead es lo que parece. Sondea más antes de cerrar.',                     hue: 'from-purple-700/40 to-slate-800/40',                                  icon: 'Drama' },
  { id: 'llave',        num: 'XXVIII',nombre: 'La Llave',           prediccion: 'Una puerta nueva se abrirá. Quizá un canal, quizá un cliente referido.',          hue: 'from-emerald-700/40 to-cyan-700/40',                                  icon: 'KeyRound' },
  { id: 'aguila',       num: 'XXIX',  nombre: 'El Águila',          prediccion: 'Eleva tu vista. Hoy decide en función del mes, no del día.',                     hue: 'from-blue-700/40 to-indigo-800/40',                                   icon: 'Bird' },
  { id: 'tormenta',     num: 'XXX',   nombre: 'La Tormenta',        prediccion: 'Día turbulento — guarda energía para los cierres importantes.',                  hue: 'from-slate-700/40 to-blue-900/40',                                    icon: 'Cloud' },
  { id: 'fenix',        num: 'XXXI',  nombre: 'El Fénix',           prediccion: 'Un lead rechazado renace. Vuelve a escribirle con un ángulo nuevo.',              hue: 'from-rose-700/40 to-orange-800/40',                                   icon: 'Flame' },
  { id: 'manantial',    num: 'XXXII', nombre: 'El Manantial',       prediccion: 'Ingresos recurrentes están al alcance. Propón un retainer.',                     hue: 'from-cyan-700/40 to-teal-800/40',                                     icon: 'Banknote' },
  { id: 'corona_neg',   num: 'XXXIII',nombre: 'La Corona Negra',    prediccion: 'El poder llega. Úsalo con templanza: el rey paciente vive más años.',            hue: 'from-zinc-700/40 via-purple-800/40 to-amber-800/40',                  icon: 'Crown' },
];

export function getTarotOfDay(today: string): TarotCard {
  return TAROT_CARDS[hashString(`tarot-${today}`) % TAROT_CARDS.length];
}

/** Si la carta apunta al tipo/source de tarea actual, otorga +20% XP. */
export function tarotMatchesTask(card: TarotCard, t: TareaDef): boolean {
  // Mapeo carta → categoría/source
  const map: Record<string, (t: TareaDef) => boolean> = {
    profeta:    (t) => t.source.toString().includes('email') || t.source === 'whatsappEnviosHoy',
    heraldo:    (t) => t.source === 'llamadasHoy' || t.source === 'llamadasTotal',
    hoja_vacia: (t) => t.source === 'whatsappPlantillas' || t.source === 'emailPlantillas',
    closer:     (t) => t.source === 'leadsConvertidos' || t.source === 'conversionesSemana' || t.source === 'conversionesMes',
    pluma:      (t) => t.source.toString().includes('email'),
    llama:      (t) => t.source.toString().includes('llamada'),
    cosecha:    (t) => t.source === 'leadsConvertidos',
    pacto:      (t) => t.source === 'propuestasAceptadas' || t.source === 'propuestasEnviadas',
    hilo_oro:   (t) => t.source === 'leadsHoy' || t.source === 'leadsInteresados',
    despertar:  (t) => t.source === 'leadsContactados',
    estrella_err: (t) => t.source === 'leadsHoy',
  };
  return map[card.id]?.(t) ?? false;
}
