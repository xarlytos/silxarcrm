'use client';

import { ChevronRight, Shield } from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import type { TareaDef } from '../_lib/types';

/* ============================================================
   Próximo Objetivo
============================================================ */

export function NextObjectiveCard({ tarea, value, onJump }: { tarea: TareaDef; value: number; onJump: () => void }) {
  const Icon = ICON_MAP[tarea.icono] ?? Shield;
  const pct = Math.min(1, value / tarea.meta);
  const restantes = Math.max(0, tarea.meta - value);
  return (
    <button
      type="button"
      onClick={onJump}
      className="group relative w-full text-left overflow-hidden rounded-2xl panel-tech panel-hover px-4 py-3"
    >
      <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-blue-500 to-violet-500" />
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-black/30 ring-1 ring-cyan-400/25 flex items-center justify-center"
             style={{ boxShadow: 'inset 0 0 14px rgba(34,211,238,0.18)' }}>
          <Icon className="w-5 h-5 text-cyan-300" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-[9.5px] uppercase tracking-[0.16em] font-semibold text-cyan-400/85">Próximo objetivo</p>
          <p className="text-[14px] font-bold text-white leading-tight mt-0.5 truncate">{tarea.titulo}</p>
          <p className="text-[11.5px] text-white/50 leading-snug truncate">{tarea.descripcion}</p>
        </div>
        <div className="text-right shrink-0 hidden sm:flex flex-col">
          <p className="text-[8.5px] uppercase tracking-wider text-white/40">Te faltan</p>
          <p className="text-[22px] font-black text-cyan-300 leading-none tabular-nums">{restantes}</p>
          <p className="text-[9px] text-white/35 font-mono">de {tarea.meta}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-cyan-300/70 shrink-0 group-hover:translate-x-1 transition-transform" />
      </div>
      {/* Mini progress bar al fondo */}
      <div className="mt-2.5 h-1 rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-[width] duration-700"
          style={{ width: `${Math.max(2, pct * 100)}%`, boxShadow: '0 0 8px rgba(34,211,238,0.5)' }}
        />
      </div>
    </button>
  );
}
