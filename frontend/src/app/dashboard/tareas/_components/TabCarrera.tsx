'use client';

import { useMemo } from 'react';
import { Activity, Crown, Flame, GaugeCircle, Gem, Lock, Sparkles, Star, Trophy } from 'lucide-react';
import { CATEGORIA_INFO } from '../_lib/icons';
import type { Categoria, TareaDef } from '../_lib/types';
import { LEVEL_TITLES } from '../_lib/levels';
import { BigStatCard, SectionHeader, SummaryRow } from './SectionHeader';

/* ============================================================
   Tab: Carrera (roadmap)
============================================================ */

export function TabCarrera({
  level, totalXp, gemas, completionPct, bestStreak, firstVisit,
  achievements, isClaimed, aureolas, bestLevel, canPrestige, onPrestige,
}: {
  level: number; totalXp: number; gemas: number; completionPct: number; bestStreak: number; firstVisit: string | null;
  achievements: TareaDef[];
  isClaimed: (t: TareaDef) => boolean;
  aureolas: number;
  bestLevel: number;
  canPrestige: boolean;
  onPrestige: () => void;
}) {
  const days = firstVisit ? Math.max(1, Math.floor((Date.now() - new Date(firstVisit).getTime()) / 86400000) + 1) : 1;

  // Calcular maestrías por categoría: % de logros desbloqueados en esa categoría
  const masterias = useMemo(() => {
    const cats: Categoria[] = ['comunicacion', 'cazador', 'ventas', 'marketing', 'productividad'];
    return cats.map((cat) => {
      const list = achievements.filter((a) => a.categoria === cat);
      const done = list.filter((a) => isClaimed(a)).length;
      const total = list.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const tier = pct >= 100 ? 'Trascendido' : pct >= 80 ? 'Gran Maestro' : pct >= 60 ? 'Maestro' : pct >= 40 ? 'Experto' : pct >= 20 ? 'Aprendiz' : 'Novato';
      return { cat, done, total, pct, tier };
    });
  }, [achievements, isClaimed]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStatCard icon={Star} label="Nivel actual" value={level} color="text-amber-500" bg="from-amber-500/15 to-amber-500/0" />
        <BigStatCard icon={Gem} label="Gemas totales" value={gemas} color="text-cyan-500" bg="from-cyan-500/15 to-cyan-500/0" />
        <BigStatCard icon={Trophy} label="Logros %" value={`${Math.round(completionPct)}%`} color="text-violet-500" bg="from-violet-500/15 to-violet-500/0" />
        <BigStatCard icon={Flame} label="Mejor racha" value={bestStreak} color="text-orange-500" bg="from-orange-500/15 to-orange-500/0" />
      </div>

      {/* === REENCARNACIÓN === */}
      <section>
        <SectionHeader icon={Sparkles} iconColor="text-fuchsia-400" title="Reencarnación" subtitle="Reseteas tu nivel a 1 a cambio de Aureolas permanentes" />
        <div className="relative overflow-hidden rounded-3xl border-2 border-fuchsia-500/40 bg-gradient-to-br from-amber-900/30 via-fuchsia-900/30 to-violet-950/40 p-5 md:p-6">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="relative flex flex-col md:flex-row md:items-center gap-5">
            <div className="relative shrink-0 mx-auto md:mx-0">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-500 blur-2xl opacity-60 animate-pulse-slow" />
              <div className="relative w-[100px] h-[100px] rounded-3xl bg-[var(--bg-tertiary)] ring-4 ring-amber-400/40 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-amber-300" />
                {aureolas > 0 && (
                  <span className="absolute -bottom-2 -right-2 inline-flex items-center justify-center px-2 h-7 rounded-xl bg-amber-400 ring-2 ring-amber-900 text-amber-900 text-[14px] font-black">
                    ×{aureolas}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h3 className="text-[22px] md:text-[26px] font-black text-amber-100 leading-tight">Aureolas Eternas</h3>
                <span className="text-[12px] uppercase tracking-wider font-bold text-amber-400">{aureolas} obtenida{aureolas === 1 ? '' : 's'}</span>
              </div>
              <p className="text-[12.5px] text-amber-100/70 mt-1 leading-snug max-w-2xl">
                Al llegar a <span className="font-bold text-amber-300">Nivel 25</span> puedes reencarnar. Tu XP y nivel vuelven a 1, pero ganas <span className="font-bold text-amber-300">una Aureola permanente</span> que otorga <span className="font-bold text-fuchsia-300">+10% XP global</span> en todas tus futuras vidas. Las Aureolas se acumulan: 5 Aureolas = +50% XP siempre. Mantienes gemas, talentos, logros, weeklies y bosses.
              </p>
              {bestLevel > level && (
                <p className="text-[11px] text-fuchsia-300/80 font-mono mt-2">Mejor nivel histórico: Lvl {bestLevel}</p>
              )}
              <p className="text-[12px] text-amber-300 mt-2">Bonus actual de aureolas: <span className="font-bold">+{aureolas * 10}% XP global permanente</span></p>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={onPrestige}
                disabled={!canPrestige}
                className="w-full md:w-auto px-6 h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-rose-500 text-white text-[14px] font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.97] shadow-xl shadow-fuchsia-500/30 ring-2 ring-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {canPrestige ? '¡Reencarnar!' : `Se desbloquea en Lvl 25`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === MAESTRÍAS === */}
      <section>
        <SectionHeader icon={GaugeCircle} iconColor="text-cyan-400" title="Maestrías" subtitle="Domina las 5 disciplinas — a 100% obtienes la rango Trascendido" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {masterias.map((m) => {
            const info = CATEGORIA_INFO[m.cat];
            const Icon = info.icon;
            return (
              <div key={m.cat} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${info.accent} border border-[var(--border-primary)] p-4`}>
                <div className="flex items-center justify-between">
                  <Icon className={`w-6 h-6 ${info.color}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${info.color}`}>{m.tier}</span>
                </div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mt-3">{info.label}</p>
                <p className={`text-[24px] font-black mt-0.5 ${info.color}`}>
                  {m.pct}<span className="text-[14px] opacity-60">%</span>
                </p>
                <p className="text-[10.5px] font-mono text-[var(--text-tertiary)]">{m.done} / {m.total} logros</p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${info.accent.replace('to-', 'to-').replace('/0', '/40')} ${info.color.replace('text-', 'from-')}`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader icon={Crown} iconColor="text-amber-400" title="Camino del Maestro" subtitle="Tu progresión de carrera" />
        <div className="rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-5 md:p-7 overflow-x-auto">
          <div className="flex items-stretch gap-3 min-w-[820px]">
            {LEVEL_TITLES.map((t, i) => {
              const isCurrent = level >= t.min && (i === LEVEL_TITLES.length - 1 || level < LEVEL_TITLES[i + 1].min);
              const isPast = level >= t.min;
              const isFuture = level < t.min;
              return (
                <div key={t.min} className="flex-1 flex flex-col items-center gap-2 relative">
                  {/* connector */}
                  {i > 0 && (
                    <div className={`absolute top-7 right-1/2 w-full h-1 rounded-full -translate-y-1/2 ${isPast ? 'bg-gradient-to-r from-amber-500/60 to-amber-400/60' : 'bg-[var(--bg-tertiary)]'}`} style={{ left: '-50%' }} />
                  )}
                  {/* node */}
                  <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[18px] z-10 transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-500 text-white ring-4 ring-amber-400/50 shadow-xl shadow-amber-500/40 scale-110'
                      : isPast
                      ? 'bg-gradient-to-br from-amber-500/30 to-violet-500/20 text-amber-400 ring-2 ring-amber-500/40'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] ring-1 ring-[var(--border-primary)]'
                  }`}>
                    {isFuture ? <Lock className="w-4 h-4" /> : t.min}
                  </div>
                  <p className={`text-center text-[11px] font-bold leading-tight ${isCurrent ? t.color : isPast ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}>
                    {t.title}
                  </p>
                  {isCurrent && (
                    <span className="inline-flex items-center px-1.5 h-[16px] rounded-md bg-amber-500/20 text-amber-500 text-[9px] font-bold uppercase tracking-wider ring-1 ring-amber-400/30">
                      Tú
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader icon={Activity} iconColor="text-emerald-400" title="Resumen de carrera" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SummaryRow label="Días desde el primer login" value={days} unit="días" />
          <SummaryRow label="XP por día (promedio)" value={Math.round(totalXp / days)} unit="XP" />
          <SummaryRow label="Para el siguiente nivel" value={Math.max(0, (level) ** 2 * 100 - totalXp)} unit="XP" />
        </div>
      </section>
    </div>
  );
}
