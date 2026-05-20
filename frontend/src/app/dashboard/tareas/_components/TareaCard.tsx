'use client';

import { Check, Gem, Lock, Shield, Star } from 'lucide-react';
import { ICON_MAP, RAREZA_INFO } from '../_lib/icons';
import type { TareaDef } from '../_lib/types';

/* ============================================================
   Tarea Card genérica — layout horizontal compacto
============================================================ */

export function TareaCard({
  tarea, progress, claimed, onClaim, bonusPct = 0,
}: {
  tarea: TareaDef;
  progress: { value: number; pct: number; done: boolean };
  claimed: boolean;
  onClaim: (ev: React.MouseEvent) => void;
  bonusPct?: number;
}) {
  const Icon = ICON_MAP[tarea.icono] ?? Shield;
  const rarezaInfo = RAREZA_INFO[tarea.rareza ?? 'comun'];
  const isReady = progress.done && !claimed;
  const xpFinal = bonusPct > 0 && tarea.tipo === 'daily' ? Math.round(tarea.xp * (1 + bonusPct / 100)) : tarea.xp;

  return (
    <div
      data-card
      className={`group relative overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-300 ${
        claimed
          ? 'bg-[var(--bg-secondary)]/60 border-[var(--border-primary)] opacity-70'
          : isReady
          ? `bg-gradient-to-br ${rarezaInfo.bg} border-amber-500/50 shadow-lg ${rarezaInfo.glow} ring-1 ring-amber-400/30 hover:scale-[1.01]`
          : `bg-[var(--bg-secondary)] ${rarezaInfo.border} hover:border-[var(--text-tertiary)]/60`
      }`}
    >
      <div data-confetti className="absolute inset-0 pointer-events-none z-20" />
      {isReady && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-transparent to-transparent animate-pulse" />
        </div>
      )}

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div
          className={`relative shrink-0 w-11 h-11 rounded-lg flex items-center justify-center bg-gradient-to-br ${rarezaInfo.bg} ring-1 ${rarezaInfo.ring} ${claimed ? 'grayscale' : ''}`}
        >
          {claimed ? (
            <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
          ) : (
            <Icon className={`w-5 h-5 ${rarezaInfo.text}`} />
          )}
        </div>

        {/* Middle: title + desc + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className={`text-[12.5px] font-bold leading-tight truncate ${
                  claimed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'
                }`}
              >
                {tarea.titulo}
              </h3>
              {tarea.tipo === 'achievement' && (
                <span
                  className={`shrink-0 inline-flex items-center px-1 h-[14px] rounded text-[8.5px] font-bold uppercase tracking-wider ring-1 ${rarezaInfo.ring} ${rarezaInfo.text}`}
                >
                  {rarezaInfo.label}
                </span>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 font-mono text-[10.5px] font-bold text-amber-500">
                <Star className="w-2.5 h-2.5 fill-amber-500" />+{xpFinal}
                {xpFinal !== tarea.xp && <span className="text-[7.5px] text-emerald-500">↑</span>}
              </span>
              {tarea.gemas ? (
                <span className="inline-flex items-center gap-0.5 font-mono text-[10.5px] font-bold text-cyan-500">
                  <Gem className="w-2.5 h-2.5 fill-cyan-500/40" />+{tarea.gemas}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-[10.5px] text-[var(--text-tertiary)] leading-snug truncate mt-0.5">
            {tarea.descripcion}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="relative flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${
                  progress.done
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                }`}
                style={{ width: `${Math.max(2, progress.pct * 100)}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
              <span className={progress.done ? 'text-emerald-500 font-bold' : 'text-[var(--text-primary)]'}>
                {Math.min(progress.value, tarea.meta)}
              </span>
              <span className="text-[var(--text-tertiary)]">/{tarea.meta}</span>
            </span>
          </div>
        </div>

        {/* Right: action */}
        <div className="shrink-0">
          {claimed ? (
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30"
              title="Conseguido"
            >
              <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
            </div>
          ) : isReady ? (
            <button
              type="button"
              onClick={onClaim}
              className="h-9 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.97] shadow-lg shadow-amber-500/30 transition-all whitespace-nowrap"
            >
              Reclamar
            </button>
          ) : (
            <div
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-tertiary)]/50"
              title="En progreso"
            >
              <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
