'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import { COMPANION_TIPS, tipOfTheDay, type CompanionStage } from '../_lib/companion';
import { todayKey } from '../_lib/utils';

/* ============================================================
   Companion Display
============================================================ */

export function CompanionDisplay({ companion }: { companion: CompanionStage }) {
  const [tip, setTip] = useState(() => tipOfTheDay(todayKey()));
  const [showTip, setShowTip] = useState(false);
  const Icon = ICON_MAP[companion.icon] ?? Sparkles;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setTip(COMPANION_TIPS[Math.floor(Math.random() * COMPANION_TIPS.length)]); setShowTip((s) => !s); }}
        className="relative w-[68px] h-[68px] rounded-2xl bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] ring-2 ring-[var(--border-primary)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform animate-float-companion shadow-lg"
        title={`${companion.name} — Clic para escuchar`}
      >
        <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${companion.aura} blur-md opacity-80`} />
        <Icon className={`relative w-9 h-9 drop-shadow-lg ${companion.iconColor}`} strokeWidth={1.6} />
        <span className="absolute -top-1 -right-1 text-[9px] font-bold uppercase tracking-wider px-1.5 h-[16px] rounded-md bg-[var(--bg-primary)] ring-1 ring-[var(--border-primary)] flex items-center text-[var(--text-secondary)]">
          {companion.name}
        </span>
      </button>
      {showTip && (
        <div className="absolute left-full top-1 ml-3 z-30 w-[200px] rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl p-3 animate-fade-in">
          <div className="absolute -left-1.5 top-3 w-3 h-3 bg-[var(--bg-secondary)] border-l border-b border-[var(--border-primary)] rotate-45" />
          <p className="text-[11.5px] italic leading-snug text-[var(--text-secondary)]">"{tip}"</p>
          <p className="text-[9.5px] uppercase tracking-wider font-bold mt-1.5 text-amber-500">— {companion.name}</p>
        </div>
      )}
    </div>
  );
}
