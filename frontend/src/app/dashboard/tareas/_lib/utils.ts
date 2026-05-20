/* ============================================================
   PRNG seeded + selección determinística
============================================================ */

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ============================================================
   Helpers de fecha (semana ISO, mes)
============================================================ */

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function isoWeek(d: Date) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
export const weekKey = () => isoWeek(new Date());
export const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function timeUntilMidnight() {
  const now = new Date();
  const m = new Date(now);
  m.setHours(24, 0, 0, 0);
  const diff = m.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${min}m`;
}
export function timeUntilNextWeek() {
  const now = new Date();
  const nextMon = new Date(now);
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  nextMon.setDate(now.getDate() + (8 - dow));
  nextMon.setHours(0, 0, 0, 0);
  const diff = nextMon.getTime() - now.getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return `${d}d ${h}h`;
}
export function timeUntilNextMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = next.getTime() - now.getTime();
  const d = Math.floor(diff / 86400000);
  return `${d}d`;
}

export function romanize(n: number): string {
  const lookup: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let num = n;
  for (const [value, sym] of lookup) {
    while (num >= value) { result += sym; num -= value; }
  }
  return result;
}
