'use client';

import { Check, Gem, Star } from 'lucide-react';
import { IconSkull } from '@tabler/icons-react';
import { ICON_MAP } from '../_lib/icons';
import type { TareaDef } from '../_lib/types';
import { timeUntilNextMonth } from '../_lib/utils';

/* ============================================================
   Boss Card
============================================================ */

export function BossCard({ tarea, progress, claimed, onClaim }: {
  tarea: TareaDef;
  progress: { value: number; pct: number; done: boolean };
  claimed: boolean;
  onClaim: (ev: React.MouseEvent) => void;
}) {
  const Icon = ICON_MAP[tarea.icono] ?? IconSkull;
  const isReady = progress.done && !claimed;
  return (
    <div
      data-card
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
        claimed
          ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
          : isReady
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-rose-500/8 to-violet-500/10 shadow-xl shadow-amber-500/20 ring-1 ring-amber-400/25'
          : 'border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-violet-950/20 to-amber-950/15 shadow-lg shadow-rose-500/15'
      }`}
    >
      <div data-confetti className="absolute inset-0 pointer-events-none z-20" />
      {/* Glow decoration */}
      <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-rose-500/15 blur-2xl animate-pulse-slow" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_30%,rgba(244,63,94,0.05)_50%,transparent_70%)] animate-shine" />

      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <div className="relative shrink-0 mx-auto md:mx-0">
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-rose-500 via-amber-500 to-violet-600 blur-xl opacity-40" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 via-amber-600 to-violet-700 ring-2 ring-rose-400/40 flex items-center justify-center shadow-xl">
            <Icon className="w-9 h-9 text-amber-200 drop-shadow-lg" />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 h-[22px] rounded-md bg-rose-500/20 ring-1 ring-rose-400/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
              <IconSkull className="w-3 h-3" /> Boss Mensual
            </span>
            {tarea.saga && (
              <span className="inline-flex items-center px-2 h-[22px] rounded-md bg-amber-500/20 ring-1 ring-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Saga · {tarea.saga}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider font-mono text-rose-300/70">Reset en {timeUntilNextMonth()}</span>
          </div>

          <h2 className="text-[18px] md:text-[22px] font-black text-amber-100 leading-tight">{tarea.titulo}</h2>
          <p className="text-[12px] text-rose-100/70 leading-snug">{tarea.descripcion}</p>

          {/* Progress bar grande */}
          <div className="mt-2 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[12px] text-amber-200">
                <span className="font-black text-[16px] text-amber-100">{Math.min(progress.value, tarea.meta)}</span>
                <span className="text-rose-300/70"> / {tarea.meta}</span>
              </span>
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-amber-300">
                  <Star className="w-3 h-3 fill-amber-400" /> +{tarea.xp.toLocaleString()} XP
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-cyan-300">
                  <Gem className="w-3 h-3 fill-cyan-400/50" /> +{tarea.gemas ?? 0}
                </span>
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-[var(--bg-tertiary)] ring-1 ring-rose-500/30 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-700 ${
                  progress.done
                    ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-300'
                    : 'bg-gradient-to-r from-rose-500 via-amber-500 to-violet-500'
                }`}
                style={{ width: `${Math.max(2, progress.pct * 100)}%` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_60%,rgba(255,255,255,0.25)_70%,transparent_80%)] animate-shine-fast pointer-events-none" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0 w-full md:w-auto">
          {claimed ? (
            <div className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300 text-[12px] font-bold w-full md:w-auto">
              <Check className="w-4 h-4" strokeWidth={3} /> Derrotado
            </div>
          ) : isReady ? (
            <button
              type="button"
              onClick={onClaim}
              className="w-full md:w-auto px-5 h-11 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white text-[13px] font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.97] shadow-lg shadow-amber-500/30 ring-1 ring-amber-400/40 transition-all animate-pulse-slow"
            >
              ¡Derrotar Boss!
            </button>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl bg-[var(--bg-tertiary)] ring-1 ring-rose-500/20 text-center w-full md:w-auto">
              <span className="text-[10px] uppercase tracking-wider text-rose-300/60">Faltan</span>
              <span className="text-[18px] font-black text-amber-200/90 leading-none">{Math.max(0, tarea.meta - progress.value)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
