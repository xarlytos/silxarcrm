'use client';

import { useState } from 'react';
import {
  Check, ChevronRight, Crown, Lock, Shield, Sparkles, Star, Sword,
  type LucideIcon,
} from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import { RAMA_INFO, TALENTS, canUnlockTalent, type Talent, type TalentRama } from '../_lib/talents';
import { hashString } from '../_lib/utils';

/* ============================================================
   Tab: Talentos — Árbol estilo RPG con sinergias
============================================================ */

export function TabTalentos({
  talents, points, level, onUnlock,
}: {
  talents: Record<string, true>;
  points: number;
  level: number;
  onUnlock: (id: string) => void;
}) {
  const ramas: TalentRama[] = ['persuasion', 'inteligencia', 'velocidad', 'imperio', 'dragon'];
  const [expanded, setExpanded] = useState<Record<TalentRama, boolean>>({
    persuasion: false, inteligencia: false, velocidad: false, imperio: false, dragon: false,
  });

  const branchHasUnlocked = (rama: TalentRama) =>
    TALENTS.some((t) => t.rama === rama && talents[t.id]);

  const synergies: {
    id: string;
    label: string;
    branches: TalentRama[];
    tone: string;
    icon: LucideIcon;
    color: string;
  }[] = [
    { id: 'triada',  label: 'Tríada Comunicativa', branches: ['persuasion', 'inteligencia', 'velocidad'], tone: 'from-rose-500/25 via-cyan-500/25 to-emerald-500/25', icon: Sparkles, color: 'text-rose-300' },
    { id: 'dominio', label: 'Dominio Absoluto',    branches: ['inteligencia', 'imperio', 'dragon'],       tone: 'from-cyan-500/25 via-amber-500/25 to-fuchsia-500/25', icon: Star,     color: 'text-amber-300' },
    { id: 'leyenda', label: 'Leyenda Viviente',    branches: ['persuasion', 'velocidad', 'dragon'],       tone: 'from-rose-500/25 via-emerald-500/25 to-fuchsia-500/25', icon: Crown,    color: 'text-fuchsia-300' },
  ];

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-violet-950/40 to-fuchsia-950/50 border border-amber-400/20 p-6 md:p-8">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        {/* Constellation dots */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => {
            const x = (hashString(`talent-star-${i}`) % 100);
            const y = (hashString(`talent-star-y-${i}`) % 100);
            const r = 0.5 + (i % 3) * 0.4;
            return <div key={i} className="absolute rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, width: r, height: r, opacity: 0.5 }} />;
          })}
        </div>

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          {/* Sword medallion */}
          <div className="shrink-0 mx-auto md:mx-0 relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-500/30 via-amber-600/20 to-rose-500/20 ring-2 ring-amber-400/40 flex items-center justify-center shadow-2xl shadow-amber-500/20">
            <div className="absolute inset-2 rounded-full border border-amber-400/30" />
            <div className="absolute inset-4 rounded-full border border-amber-400/15" />
            <Sword className="w-12 h-12 md:w-14 md:h-14 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <Sparkles className="absolute -top-2 -right-1 w-4 h-4 text-amber-300/70" />
            <Sparkles className="absolute -bottom-1 -left-2 w-3 h-3 text-amber-300/50" />
          </div>

          {/* Title */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-amber-400/80">Árbol de Talentos</p>
            <h2 className="text-[36px] md:text-[44px] font-black text-[var(--text-primary)] mt-1 leading-tight">Especialízate</h2>
            <p className="text-[13px] md:text-[14px] text-[var(--text-secondary)] mt-2 max-w-xl mx-auto md:mx-0">
              Cada nivel te concede 1 punto. Invierte en 3 ramas con sinergias propias.<br className="hidden md:block" />
              Los efectos son permanentes y se aplican al <span className="text-amber-300 font-semibold">instante</span>.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center md:justify-end gap-8 md:gap-10 shrink-0">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-fuchsia-300/80">Puntos disponibles</p>
              <p className="text-[44px] md:text-[56px] font-black text-amber-300 leading-none drop-shadow-[0_0_14px_rgba(251,191,36,0.4)] mt-1">{points}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-fuchsia-300/80">Nivel actual</p>
              <div className="mt-1 relative inline-flex items-center justify-center w-[64px] h-[72px]">
                <Shield className="absolute inset-0 w-full h-full text-amber-500/30" fill="currentColor" />
                <Shield className="absolute inset-0 w-full h-full text-amber-400/70" strokeWidth={1.5} />
                <span className="relative text-[26px] font-black text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">{level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Five branches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {ramas.map((rama) => {
          const info = RAMA_INFO[rama];
          const ramaTalents = TALENTS.filter((t) => t.rama === rama);
          const unlocked = ramaTalents.filter((t) => talents[t.id]).length;
          const ramaMin = ramaTalents[0]?.minLevel ?? 1;
          const ramaLocked = level < ramaMin;
          const isExpanded = expanded[rama];
          const visibleTalents = isExpanded ? ramaTalents : ramaTalents.slice(0, 4);
          const headerIconName = ramaTalents[0]?.icono ?? 'Sparkles';
          const HeaderIcon = ICON_MAP[headerIconName] ?? Sparkles;

          return (
            <div
              key={rama}
              className={`relative overflow-hidden rounded-2xl border ${info.ring} bg-gradient-to-b from-[var(--bg-secondary)]/80 via-[var(--bg-primary)]/95 to-[var(--bg-primary)] flex flex-col ${ramaLocked ? 'opacity-75' : ''}`}
            >
              {/* Branch glow */}
              <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-30 bg-gradient-to-br ${info.bg} pointer-events-none`} />

              {/* Header */}
              <div className="relative p-4 pb-3 border-b border-[var(--border-primary)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Diamond icon */}
                    <div className="relative shrink-0 w-12 h-12 flex items-center justify-center">
                      <div className={`absolute inset-0 rotate-45 rounded-md bg-gradient-to-br ${info.bg} ring-1 ${info.ring}`} />
                      <div className={`absolute inset-1 rotate-45 rounded-md border ${info.ring} opacity-50`} />
                      <HeaderIcon className={`relative w-5 h-5 ${info.color} drop-shadow-[0_0_6px_currentColor]`} />
                    </div>
                    <h3 className={`text-[14px] font-black uppercase tracking-wider ${info.color} truncate`}>{info.label}</h3>
                  </div>
                  <span className={`text-[12px] font-mono font-bold ${info.color} shrink-0`}>
                    {unlocked}/{ramaTalents.length}
                  </span>
                </div>
                {ramaLocked && (
                  <p className="mt-2 text-[9.5px] uppercase tracking-[0.18em] font-bold text-amber-400/80 flex items-center gap-1.5">
                    Se desbloquea en Lvl {ramaMin}
                    <Lock className="w-3 h-3" />
                  </p>
                )}
              </div>

              {/* Talent rows */}
              <div className="relative p-3 space-y-3 flex-1">
                {/* Vertical connector line */}
                <div
                  className="absolute top-5 bottom-5 w-px"
                  style={{
                    left: '36px',
                    background: `linear-gradient(180deg, ${info.line}55, ${info.line}15)`,
                  }}
                />
                {visibleTalents.map((t) => (
                  <TalentRow
                    key={t.id}
                    talent={t}
                    unlocked={!!talents[t.id]}
                    canUnlock={canUnlockTalent(t, talents, points, level)}
                    branchLocked={ramaLocked}
                    onUnlock={() => onUnlock(t.id)}
                    info={info}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-white/5 px-4 py-3">
                {ramaLocked ? (
                  <div className={`flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold ${info.color} opacity-60`}>
                    Bloqueada <Lock className="w-3 h-3" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [rama]: !p[rama] }))}
                    className={`w-full flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-bold ${info.color} opacity-70 hover:opacity-100 transition-opacity`}
                  >
                    Ver detalles
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Synergies */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[var(--bg-secondary)] to-[var(--bg-primary)] border border-amber-400/20 p-5">
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-3 lg:w-80 shrink-0">
            <div className="shrink-0 w-12 h-12 relative flex items-center justify-center">
              <div className="absolute inset-0 rotate-45 rounded-md bg-gradient-to-br from-amber-500/30 to-fuchsia-500/20 ring-1 ring-amber-400/40" />
              <Sparkles className="relative w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[var(--text-primary)]">Sinergias activas</p>
              <p className="text-[11px] text-[var(--text-tertiary)] leading-snug mt-0.5">
                Invierte en al menos 3 ramas para desbloquear sinergias poderosas.
              </p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {synergies.map((s) => {
              const count = s.branches.filter(branchHasUnlocked).length;
              const active = count === 3;
              const SIcon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`relative rounded-xl p-3 flex items-center gap-3 border transition-colors ${
                    active
                      ? `border-amber-400/60 bg-gradient-to-br ${s.tone}`
                      : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className={`shrink-0 w-10 h-10 relative flex items-center justify-center`}>
                    <div className={`absolute inset-0 rotate-45 rounded-md bg-gradient-to-br ${s.tone} ring-1 ring-[var(--border-primary)]`} />
                    <SIcon className={`relative w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--text-primary)] truncate">
                      {s.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                      {s.branches.map((b) => RAMA_INFO[b].label).join(' + ')}
                    </p>
                  </div>
                  <span
                    className={`text-[12px] font-mono font-bold shrink-0 ${
                      active ? 'text-amber-300' : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {count}/3
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TalentRow({
  talent, unlocked, canUnlock, branchLocked, onUnlock, info,
}: {
  talent: Talent;
  unlocked: boolean;
  canUnlock: boolean;
  branchLocked: boolean;
  onUnlock: () => void;
  info: { label: string; color: string; bg: string; ring: string; line: string };
}) {
  const Icon = ICON_MAP[talent.icono] ?? Shield;
  const interactive = canUnlock && !branchLocked;
  const dimmed = branchLocked || (!unlocked && !canUnlock);
  return (
    <div className="relative flex items-start gap-3">
      {/* Tier label */}
      <span
        className={`relative shrink-0 z-10 w-7 h-5 mt-1 rounded-md text-[9.5px] font-bold flex items-center justify-center ring-1 ${info.ring} bg-[var(--bg-primary)] ${info.color}`}
      >
        T{talent.tier}
      </span>
      {/* Diamond icon */}
      <button
        type="button"
        onClick={interactive ? onUnlock : undefined}
        disabled={!interactive}
        className="relative shrink-0 z-10 w-8 h-8 mt-0.5 flex items-center justify-center group"
        title={
          branchLocked
            ? 'Rama bloqueada'
            : unlocked
              ? 'Desbloqueado'
              : canUnlock
                ? 'Click para desbloquear'
                : 'Requiere talento anterior'
        }
      >
        <div
          className={`absolute inset-0 rotate-45 rounded-md transition-all ${
            unlocked
              ? `bg-gradient-to-br ${info.bg} ring-1 ${info.ring} shadow-[0_0_12px_currentColor] ${info.color}`
              : interactive
                ? `bg-[var(--bg-tertiary)] ring-1 ${info.ring} group-hover:scale-110 cursor-pointer`
                : 'bg-[var(--bg-tertiary)]/60 ring-1 ring-[var(--border-primary)]'
          }`}
        />
        {dimmed ? (
          <Lock className="relative w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        ) : unlocked ? (
          <Check className={`relative w-4 h-4 ${info.color}`} strokeWidth={3} />
        ) : (
          <Icon className={`relative w-4 h-4 ${info.color}`} />
        )}
      </button>
      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p
          className={`text-[12.5px] font-bold leading-tight ${
            dimmed ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {talent.nombre}
        </p>
        <p className="text-[10.5px] text-[var(--text-tertiary)] leading-snug mt-0.5">
          {talent.desc}
        </p>
      </div>
    </div>
  );
}
