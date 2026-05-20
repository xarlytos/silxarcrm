'use client';

import { useState } from 'react';
import { COMPANION_TIPS, tipOfTheDay, type CompanionStage } from '../_lib/companion';
import { todayKey } from '../_lib/utils';

/* ============================================================
   Companion Display — Muestra la mascota con imagen
============================================================ */

export function CompanionDisplay({ companion }: { companion: CompanionStage }) {
  const [tip, setTip] = useState(() => tipOfTheDay(todayKey()));
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setTip(COMPANION_TIPS[Math.floor(Math.random() * COMPANION_TIPS.length)]);
          setShowTip((s) => !s);
        }}
        className="relative w-[88px] h-[88px] rounded-2xl ring-2 ring-[var(--border-primary)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform animate-float-companion shadow-lg overflow-hidden bg-[var(--bg-secondary)]"
        title={`${companion.name} — Clic para escuchar`}
      >
        {/* Aura glow */}
        <div className={`absolute -inset-2 rounded-2xl bg-gradient-to-br ${companion.aura} blur-lg opacity-50 pointer-events-none`} />

        {/* Mascot image — object-cover llena y recorta el espacio */}
        <img
          src={companion.image}
          alt={companion.name}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Name badge */}
        <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider px-1.5 h-[16px] rounded-md bg-black/60 text-white flex items-center z-10">
          {companion.name}
        </span>
      </button>

      {showTip && (
        <div className="absolute left-full top-1 ml-3 z-30 w-[200px] rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-xl p-3 animate-fade-in">
          <div className="absolute -left-1.5 top-3 w-3 h-3 bg-[var(--bg-secondary)] border-l border-b border-[var(--border-primary)] rotate-45" />
          <p className="text-[11.5px] italic leading-snug text-[var(--text-secondary)]">&quot;{tip}&quot;</p>
          <p className="text-[9.5px] uppercase tracking-wider font-bold mt-1.5 text-amber-500">— {companion.name}</p>
        </div>
      )}
    </div>
  );
}
