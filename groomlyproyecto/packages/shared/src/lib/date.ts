/**
 * Helpers de fecha centralizados.
 *
 * Importante: ymd() usa componentes locales (no toISOString) para evitar el
 * desplazamiento de día en zonas con offset cuando la hora local cae cerca de
 * la frontera (p.ej. Madrid en horario nocturno).
 */

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
}

export function startOfIsoWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function endOfIsoWeek(d: Date): Date {
  const monday = startOfIsoWeek(d);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday;
}

export function startOfMonth(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  first.setHours(0, 0, 0, 0);
  return first;
}

export function endOfMonth(d: Date): Date {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  last.setHours(23, 59, 59, 999);
  return last;
}

/**
 * Rango que cubre el grid completo de dayGridMonth en FullCalendar.
 * Va desde el lunes de la semana del día 1 hasta el domingo de la semana
 * del último día del mes.
 */
export function monthGridRange(d: Date): { from: string; to: string } {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startDay = first.getDay();
  const diffToMonday = (startDay + 6) % 7;
  const monday = new Date(first);
  monday.setDate(first.getDate() - diffToMonday);
  const endDay = last.getDay();
  const diffToSunday = (7 - endDay) % 7;
  const sunday = new Date(last);
  sunday.setDate(last.getDate() + diffToSunday);
  return { from: ymd(monday), to: ymd(sunday) };
}

export type CalendarView = 'day' | 'week' | 'month';

export function rangeForView(
  view: CalendarView,
  currentDate: Date,
): { from: string; to: string } {
  if (view === 'day') {
    const d = ymd(currentDate);
    return { from: d, to: d };
  }
  if (view === 'month') {
    return monthGridRange(currentDate);
  }
  // semana lunes-domingo
  const monday = startOfIsoWeek(currentDate);
  const sunday = endOfIsoWeek(currentDate);
  return { from: ymd(monday), to: ymd(sunday) };
}

/** Diferencia en días entre dos fechas, normalizando a medianoche. */
export function daysBetween(a: Date, b: Date): number {
  const A = new Date(a);
  A.setHours(0, 0, 0, 0);
  const B = new Date(b);
  B.setHours(0, 0, 0, 0);
  return Math.round((A.getTime() - B.getTime()) / 86400000);
}

export function spanishDate(d: Date): string {
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
