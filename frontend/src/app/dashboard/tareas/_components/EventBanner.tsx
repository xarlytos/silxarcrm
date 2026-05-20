'use client';

import { Sparkles } from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import type { DailyEvent } from '../_lib/events';

/* ============================================================
   Event Banner — Evento del Día
============================================================ */

export function EventBanner({ event }: { event: DailyEvent }) {
  const Icon = ICON_MAP[event.icono] ?? Sparkles;
  const colorMap: Record<string, { tint: string; text: string; dot: string; glow: string }> = {
    blue:    { tint: 'rgba(59,130,246,0.10)',  text: 'text-blue-300',    dot: 'bg-blue-400',    glow: 'rgba(59,130,246,0.25)' },
    cyan:    { tint: 'rgba(34,211,238,0.10)',  text: 'text-cyan-300',    dot: 'bg-cyan-400',    glow: 'rgba(34,211,238,0.25)' },
    rose:    { tint: 'rgba(244,63,94,0.10)',   text: 'text-rose-300',    dot: 'bg-rose-400',    glow: 'rgba(244,63,94,0.25)' },
    fuchsia: { tint: 'rgba(217,70,239,0.10)',  text: 'text-fuchsia-300', dot: 'bg-fuchsia-400', glow: 'rgba(217,70,239,0.25)' },
    amber:   { tint: 'rgba(251,191,36,0.10)',  text: 'text-amber-300',   dot: 'bg-amber-400',   glow: 'rgba(251,191,36,0.25)' },
    emerald: { tint: 'rgba(16,185,129,0.10)',  text: 'text-emerald-300', dot: 'bg-emerald-400', glow: 'rgba(16,185,129,0.25)' },
    violet:  { tint: 'rgba(139,92,246,0.10)',  text: 'text-violet-300',  dot: 'bg-violet-400',  glow: 'rgba(139,92,246,0.25)' },
    slate:   { tint: 'rgba(100,116,139,0.08)', text: 'text-slate-300',   dot: 'bg-slate-400',   glow: 'rgba(100,116,139,0.18)' },
  };
  const c = colorMap[event.color] ?? colorMap.violet;
  return (
    <div className="relative overflow-hidden rounded-2xl panel-base panel-hover px-4 py-3 flex items-center gap-3.5"
         style={{ background: `linear-gradient(135deg, ${c.tint}, transparent 60%), rgba(14,14,19,0.72)` }}>
      <div className={`relative shrink-0 w-10 h-10 rounded-xl bg-black/30 ring-1 ring-white/10 flex items-center justify-center`}
           style={{ boxShadow: `inset 0 0 16px ${c.glow}` }}>
        <Icon className={`w-5 h-5 ${c.text}`} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0 leading-tight">
        <div className="flex items-center gap-2">
          <span className="text-[9.5px] uppercase tracking-[0.16em] font-semibold text-white/45">Evento del día</span>
          <span className="inline-flex items-center gap-1">
            <span className={`relative flex w-1.5 h-1.5`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${c.dot}`} />
              <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${c.dot}`} />
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${c.text}`}>Activo</span>
          </span>
        </div>
        <h3 className="text-[14px] font-bold text-white leading-tight mt-0.5">{event.titulo}</h3>
        <p className="text-[11.5px] text-white/55 leading-snug truncate">{event.desc}</p>
      </div>
    </div>
  );
}
