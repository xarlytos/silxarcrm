'use client';

import { Sparkles, Star } from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import type { TarotCard } from '../_lib/tarot';

/* ============================================================
   Tarot Widget — carta del día con flip 3D
============================================================ */

export function TarotWidget({ card, revealed, onReveal }: { card: TarotCard; revealed: boolean; onReveal: () => void }) {
  return (
    <div className="relative">
      {/* Glow ambiental detrás */}
      <div className="absolute -inset-6 rounded-3xl bg-amber-500/[0.10] blur-3xl animate-breathing pointer-events-none" />
      <div
        className="tarot-card-3d relative w-full aspect-[5/7] cursor-pointer select-none"
        style={{ perspective: '1000px' }}
        onClick={onReveal}
      >
        <div className={`tarot-card-inner relative w-full h-full transition-transform duration-[1100ms]`} style={{ transformStyle: 'preserve-3d', transform: revealed ? 'rotateY(180deg)' : 'rotateY(0)' }}>
          {/* Back */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden ring-2 ring-amber-500/50 shadow-2xl shadow-amber-500/30 bg-gradient-to-br from-violet-900 via-indigo-950 to-violet-950" style={{ backfaceVisibility: 'hidden' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15),transparent_60%)]" />
            <div className="absolute inset-3 rounded-xl border-2 border-amber-400/30" />
            <div className="absolute inset-6 rounded-lg border border-amber-400/20" />
            {/* Símbolo central */}
            <div className="relative w-full h-full flex flex-col items-center justify-center text-amber-300">
              <Sparkles className="w-16 h-16 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse-slow" strokeWidth={1.2} />
              <p className="mt-3 text-[10px] uppercase tracking-[0.4em] font-bold text-amber-400/70">Tarot del</p>
              <p className="text-[14px] font-black uppercase tracking-[0.3em] text-amber-300">Marketer</p>
              <p className="mt-3 text-[10px] text-amber-300/70 italic">Toca para revelar</p>
            </div>
            {/* Esquinas decorativas */}
            <Star className="absolute top-2 left-2 w-3 h-3 text-amber-400/60 fill-amber-400/40" />
            <Star className="absolute top-2 right-2 w-3 h-3 text-amber-400/60 fill-amber-400/40" />
            <Star className="absolute bottom-2 left-2 w-3 h-3 text-amber-400/60 fill-amber-400/40" />
            <Star className="absolute bottom-2 right-2 w-3 h-3 text-amber-400/60 fill-amber-400/40" />
          </div>
          {/* Front (la carta revelada) */}
          <div
            className={`absolute inset-0 rounded-2xl overflow-hidden ring-2 ring-amber-500/50 shadow-2xl shadow-amber-500/30 bg-gradient-to-br ${card.hue}`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: '0 1px 0 rgba(251,191,36,0.4) inset, 0 20px 50px -10px rgba(251,191,36,0.30), 0 0 60px rgba(251,191,36,0.15)',
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_70%)]" />
            {/* Holographic shine */}
            <div className="absolute inset-0 holo-shine pointer-events-none" />
            <div className="absolute inset-2 rounded-xl border border-amber-300/30" />

            <div className="relative w-full h-full flex flex-col p-4">
              {/* Header */}
              <div className="flex items-center justify-between text-amber-200/90">
                <span className="text-[11px] font-bold tracking-[0.2em]">{card.num}</span>
                <span className="text-[11px] tracking-wider">ARCANO</span>
              </div>
              {/* Icono grande */}
              <div className="flex-1 flex items-center justify-center">
                {(() => {
                  const Icon = ICON_MAP[card.icon] ?? Sparkles;
                  return <Icon className="w-20 h-20 text-amber-100 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" strokeWidth={1.3} />;
                })()}
              </div>
              {/* Nombre */}
              <div className="text-center mb-2">
                <p className="text-[15px] font-black uppercase tracking-[0.15em] text-amber-100 leading-tight">{card.nombre}</p>
              </div>
              {/* Predicción */}
              <div className="border-t border-amber-300/20 pt-2">
                <p className="text-[10.5px] italic text-amber-100/85 leading-snug text-center line-clamp-4">
                  {card.prediccion}
                </p>
              </div>
              <div className="flex items-center justify-between text-amber-200/60 mt-2">
                <Star className="w-2.5 h-2.5 fill-amber-400/60" />
                <span className="text-[9px] tracking-widest font-bold">{card.num}</span>
                <Star className="w-2.5 h-2.5 fill-amber-400/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {revealed && (
        <p className="inline-flex items-center justify-center gap-1.5 w-full text-[10.5px] text-amber-500/80 text-center mt-2 font-semibold">
          <Sparkles className="w-3 h-3" /> Las tareas afines a la carta dan +20% XP hoy <Sparkles className="w-3 h-3" />
        </p>
      )}
    </div>
  );
}
