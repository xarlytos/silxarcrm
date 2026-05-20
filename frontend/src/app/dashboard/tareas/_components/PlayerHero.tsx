'use client';

import { Flame, Gem, Sparkles, Star, Trophy, type LucideIcon } from 'lucide-react';
import type { StreakBuff } from '../_lib/levels';
import type { CompanionStage } from '../_lib/companion';
import { CompanionDisplay } from './CompanionDisplay';

/* ============================================================
   Player Hero
============================================================ */

export function PlayerHero({
  level, xpInLevel, xpForNext, totalXp, totalGemas, progress, titleInfo, streak, bestStreak, buff, unlocked, totalAch, companion,
}: {
  level: number; xpInLevel: number; xpForNext: number; totalXp: number; totalGemas: number;
  progress: number;
  titleInfo: { title: string; color: string };
  streak: number; bestStreak: number;
  buff: StreakBuff;
  unlocked: number; totalAch: number;
  companion: CompanionStage;
}) {
  // Milestones cada 25% de la barra
  const milestones = [0.25, 0.5, 0.75, 1].map((m) => ({ pct: m, xp: Math.round(xpForNext * m) }));

  return (
    <div className="relative overflow-hidden rounded-3xl panel-base p-5">
      {/* Sutil tinte ambient en esquina */}
      <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-violet-500/[0.08] blur-3xl animate-breathing pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-72 h-72 rounded-full bg-amber-500/[0.06] blur-3xl animate-breathing pointer-events-none" style={{ animationDelay: '2.5s' }} />

      <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 items-center">
        {/* === HEXÁGONO + COMPANION === */}
        <div className="flex items-center gap-3 mx-auto md:mx-0">
          <HexagonAvatar level={level} />
          <CompanionDisplay companion={companion} />
        </div>

        {/* === TÍTULO + XP BAR === */}
        <div className="min-w-0 space-y-3">
          {/* Title */}
          <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
            <h1 className="text-[24px] md:text-[28px] font-black tracking-tight text-[var(--text-primary)] leading-none">
              {titleInfo.title}
            </h1>
            <span className="text-[10.5px] uppercase tracking-[0.2em] font-bold text-amber-500/90">
              Nivel {level}
            </span>
          </div>

          {/* XP bar con milestones */}
          <div className="space-y-2">
            <div className="relative">
              {/* Track */}
              <div className="relative h-2.5 rounded-full bg-[var(--bg-tertiary)] ring-1 ring-[var(--border-primary)] overflow-hidden">
                {/* Fill */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-fuchsia-500 to-violet-500 transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                    boxShadow: '0 0 12px rgba(217,70,239,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                />
                {/* Shimmer */}
                <div
                  className="absolute inset-0 xp-shimmer pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - Math.min(100, Math.max(0, progress * 100))}% 0 0)` }}
                />
              </div>
              {/* Milestone diamonds — encima de la barra */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
                {milestones.map((m, i) => {
                  const reached = progress >= m.pct;
                  return (
                    <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${m.pct * 100}%`, top: '50%' }}>
                      <div className={`w-2 h-2 rotate-45 ${reached ? 'bg-amber-300' : 'bg-[var(--border-primary)]'} ${reached ? 'shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''}`} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Métricas + milestones labels */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-[var(--text-secondary)]">
                <span className="text-amber-500 font-bold">{xpInLevel}</span>
                <span className="text-[var(--text-tertiary)]"> / {xpForNext} XP</span>
              </span>
              <div className="hidden sm:flex items-center gap-3">
                {milestones.slice(0, 3).map((m, i) => (
                  <span key={i} className={`text-[10px] font-mono ${progress >= m.pct ? 'text-amber-500' : 'text-[var(--text-tertiary)]'}`}>
                    {m.xp} XP
                  </span>
                ))}
                <span className={`text-[10px] font-mono ${progress >= 1 ? 'text-amber-500' : 'text-[var(--text-tertiary)]'}`}>
                  {xpForNext} XP
                </span>
              </div>
              <span className="text-[var(--text-tertiary)]">
                Total: <span className="font-mono text-violet-500 font-bold">{totalXp.toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Buff — discreto en una sola línea */}
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-2 px-2.5 h-7 rounded-lg ${
              buff.level > 0 ? 'bg-orange-500/10 ring-1 ring-orange-500/25 text-orange-500' : 'bg-[var(--surface-hover)] ring-1 ring-[var(--border-primary)] text-[var(--text-tertiary)]'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span className="text-[11px] font-bold">{buff.name}</span>
              <span className="text-[10.5px] opacity-75">·</span>
              <span className="text-[10.5px] opacity-85 font-mono">{buff.desc}</span>
            </div>
          </div>
        </div>

        {/* === STATS COMPACT === */}
        <div className="grid grid-cols-3 md:grid-cols-1 gap-2 md:w-[170px] shrink-0">
          <CompactStat icon={Flame} value={streak} label={`Racha · máx ${bestStreak}`} color="text-orange-500" iconBg="bg-orange-500/10" ring="ring-orange-500/25" />
          <CompactStat icon={Gem} value={totalGemas.toLocaleString()} label="Gemas" color="text-cyan-500" iconBg="bg-cyan-500/10" ring="ring-cyan-500/25" />
          <CompactStat icon={Trophy} value={`${unlocked}/${totalAch}`} label="Logros" color="text-violet-500" iconBg="bg-violet-500/10" ring="ring-violet-500/25" />
        </div>
      </div>
    </div>
  );
}

/* === Compact stat row (más denso) === */
function CompactStat({ icon: Icon, value, label, color, iconBg, ring }: { icon: LucideIcon; value: number | string; label: string; color: string; iconBg: string; ring: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-2.5 h-12 rounded-xl ${iconBg} ring-1 ${ring}`}>
      <Icon className={`w-4 h-4 ${color} shrink-0`} strokeWidth={2} />
      <div className="min-w-0 leading-tight">
        <p className={`text-[15px] font-black ${color} tabular-nums`}>{value}</p>
        <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-[var(--text-tertiary)] truncate">{label}</p>
      </div>
    </div>
  );
}

/* === HexagonAvatar SVG === */
function HexagonAvatar({ level }: { level: number }) {
  const size = 116;
  // hex points (flat-top inverted? prefer pointy-top for vertical orientation)
  // pointy-top: top/bottom are points; we want sides flat → use flat-top
  const points = '58,4 110,30 110,86 58,112 6,86 6,30';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div className="absolute inset-0 -m-2 rounded-2xl bg-gradient-to-br from-amber-400/30 via-fuchsia-500/30 to-violet-600/30 blur-2xl animate-breathing" />
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="relative">
        <defs>
          <linearGradient id="hexFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="60%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="hexStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <radialGradient id="hexInner" cx="50%" cy="35%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="hexShadow"><feGaussianBlur stdDeviation="1" /></filter>
        </defs>
        {/* outer ring (gold) */}
        <polygon points={points} fill="url(#hexStroke)" />
        {/* inner */}
        <polygon points="58,11 103,33 103,83 58,105 13,83 13,33" fill="url(#hexFill)" />
        {/* Inner light highlight */}
        <polygon points="58,11 103,33 103,83 58,105 13,83 13,33" fill="url(#hexInner)" />
        {/* Internal facet line */}
        <polyline points="13,33 58,55 103,33" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1="58" y1="55" x2="58" y2="105" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* Level number */}
        <text x="58" y="76" textAnchor="middle" fontSize="36" fontWeight="900" fill="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>{level}</text>
      </svg>
      {/* Star pip */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-amber-400 ring-2 ring-[var(--bg-primary)] flex items-center justify-center shadow-lg shadow-amber-500/40">
        <Star className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
      </div>
    </div>
  );
}
