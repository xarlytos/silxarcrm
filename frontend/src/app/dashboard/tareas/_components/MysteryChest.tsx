'use client';

import { Check, ChevronRight, Gem, Package, Star, Zap } from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import type { ChestTier, ChestReward } from '../_lib/chest';
import { timeUntilMidnight } from '../_lib/utils';

/* ============================================================
   Mystery Chest — Cofre del Día
============================================================ */

export function MysteryChest({ tier, opened, lastReward, streak, onOpen }: {
  tier: ChestTier;
  opened: boolean;
  lastReward: ChestReward | null;
  streak: number;
  onOpen: (ev: React.MouseEvent) => void;
}) {
  const Icon = ICON_MAP[tier.icon] ?? Package;
  return (
    <div data-card
      className={`relative overflow-hidden rounded-2xl px-4 py-3.5 ${opened ? 'panel-base' : 'panel-premium panel-hover'}`}>
      <div data-confetti className="absolute inset-0 pointer-events-none z-20" />
      {/* Aura radial detrás del cofre */}
      {!opened && (
        <>
          <div className="absolute -top-10 -left-6 w-40 h-40 rounded-full bg-amber-500/18 blur-2xl animate-breathing pointer-events-none" />
          <div className="absolute -bottom-10 right-0 w-36 h-36 rounded-full bg-orange-600/12 blur-2xl animate-breathing pointer-events-none" style={{ animationDelay: '2s' }} />
          {/* Partículas flotantes */}
          <span className="particle-dust text-amber-500/70" style={{ left: '20%', top: '70%', animationDelay: '0s' }} />
          <span className="particle-dust text-amber-500/70" style={{ left: '35%', top: '60%', animationDelay: '1.2s' }} />
          <span className="particle-dust text-amber-500/70" style={{ left: '15%', top: '80%', animationDelay: '2.4s' }} />
        </>
      )}

      <div className="relative flex items-center gap-3.5">
        {/* Chest icon */}
        <div className="relative shrink-0">
          <div className={`relative w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] ring-1 ring-amber-400/30 flex items-center justify-center ${opened ? '' : 'animate-chest-bob'}`}
               style={{ boxShadow: opened ? 'none' : 'inset 0 0 18px rgba(251,191,36,0.25)' }}>
            <Icon className={`w-8 h-8 ${tier.iconColor}`} strokeWidth={1.3} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-[0.16em] font-semibold text-amber-500/85">Cofre del día</span>
            <span className="text-[9.5px] font-mono text-[var(--text-tertiary)]">
              {tier.name} · racha {streak}d
            </span>
          </div>
          {opened && lastReward ? (
            <>
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight mt-0.5">Abierto hoy · vuelve en {timeUntilMidnight()}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11.5px] font-mono font-bold text-amber-500">
                  <Star className="w-3 h-3 fill-amber-300" /> +{lastReward.xp.toLocaleString()} XP
                </span>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-mono font-bold text-cyan-500">
                  <Gem className="w-3 h-3 fill-cyan-300/40" /> +{lastReward.gemas.toLocaleString()}
                </span>
                {lastReward.crit && (
                  <span className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-md bg-rose-500/20 ring-1 ring-rose-400/40 text-rose-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    <Zap className="w-3 h-3" /> Crítico ×2
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight mt-0.5">Tu cofre te espera</h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                {tier.xpMin}-{tier.xpMax} XP · {tier.gemMin}-{tier.gemMax} gemas · {Math.round(tier.critChance * 100)}% crítico
              </p>
            </>
          )}
        </div>

        {/* CTA contenido */}
        <div className="shrink-0">
          {opened ? (
            <div className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[var(--surface-hover)] ring-1 ring-[var(--border-primary)] text-[var(--text-tertiary)] text-[11px] font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} /> Abierto
            </div>
          ) : (
            <button type="button" onClick={onOpen}
              className="relative inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[12px] font-bold uppercase tracking-wider text-amber-950 transition-all active:scale-[0.97] hover:brightness-110"
              style={{
                background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 -1px 0 rgba(0,0,0,0.2) inset, 0 6px 20px -4px rgba(251,191,36,0.55)',
              }}>
              Abrir cofre
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
