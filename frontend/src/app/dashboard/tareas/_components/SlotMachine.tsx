'use client';

import { useState } from 'react';
import { IconDice } from '@tabler/icons-react';
import { ICON_MAP } from '../_lib/icons';
import { SLOT_SYMBOLS, type SlotSymbol } from '../_lib/slots';

/* ============================================================
   Slot Machine — Casino del fin de semana
============================================================ */

export function SlotMachine({
  spinsUsed, lastReward, onSpin,
}: {
  spinsUsed: number;
  lastReward: { reels: string[]; xp: number; gemas: number; tipo: string } | null;
  onSpin: () => { reels: SlotSymbol[]; reward: { xp: number; gemas: number; tipo: string } } | null;
}) {
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<SlotSymbol[]>(() => {
    if (lastReward) {
      return lastReward.reels.map((id) => SLOT_SYMBOLS.find((s) => s.id === id) ?? SLOT_SYMBOLS[0]);
    }
    return [SLOT_SYMBOLS[0], SLOT_SYMBOLS[0], SLOT_SYMBOLS[0]];
  });
  const [lastTipo, setLastTipo] = useState<string | null>(lastReward?.tipo ?? null);
  const [lastWinXp, setLastWinXp] = useState(lastReward?.xp ?? 0);
  const [lastWinGemas, setLastWinGemas] = useState(lastReward?.gemas ?? 0);

  const handleSpin = () => {
    if (spinning || spinsUsed >= 3) return;
    setSpinning(true);
    // Animación: cambiar símbolos rápido durante 1.4s, luego aplicar resultado real
    const final = onSpin();
    if (!final) { setSpinning(false); return; }
    const tickInterval = 60;
    const totalMs = 1500;
    const ticks = totalMs / tickInterval;
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      setReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
      if (tick >= ticks) {
        clearInterval(interval);
        setReels(final.reels);
        setLastTipo(final.reward.tipo);
        setLastWinXp(final.reward.xp);
        setLastWinGemas(final.reward.gemas);
        setSpinning(false);
      }
    }, tickInterval);
  };

  const restantes = Math.max(0, 3 - spinsUsed);
  const isJackpot = lastTipo?.startsWith('jackpot') || lastTipo?.startsWith('JACKPOT');
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/50 via-violet-950/50 to-rose-950/50 p-4 shadow-xl shadow-fuchsia-500/15">
      <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-fuchsia-500/12 blur-2xl animate-pulse-slow" />
      <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-rose-500/12 blur-2xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 h-[20px] rounded-md bg-fuchsia-500/20 ring-1 ring-fuchsia-400/40 text-fuchsia-300 text-[10px] font-bold uppercase tracking-wider">
              Solo Sáb/Dom
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono text-fuchsia-300/70">
              Tiradas restantes: <span className="text-amber-400 font-bold">{restantes} / 3</span>
            </span>
          </div>
          <h2 className="text-[18px] md:text-[20px] font-black text-fuchsia-100 leading-tight mt-1">Casino del Fin de Semana</h2>
          <p className="text-[12.5px] text-fuchsia-200/70 leading-snug">3-en-raya = jackpot (más raro el símbolo, mayor premio). 🐉 = 8000 XP + 1500 gemas.</p>

          {lastTipo && (
            <div className={`mt-3 flex items-center gap-2 flex-wrap text-[12px] ${isJackpot ? 'animate-pulse' : ''}`}>
              <span className={`inline-flex items-center px-2 h-7 rounded-lg font-bold ${
                isJackpot
                  ? 'bg-gradient-to-r from-amber-400 via-fuchsia-500 to-rose-500 text-white shadow-lg shadow-amber-500/30'
                  : lastTipo === 'doble' ? 'bg-cyan-500/20 ring-1 ring-cyan-400/40 text-cyan-300' : 'bg-slate-500/20 ring-1 ring-slate-400/40 text-slate-300'
              }`}>
                {isJackpot ? `🎉 ${lastTipo === 'JACKPOT_DRAGON' ? '¡JACKPOT DRAGÓN!' : '¡JACKPOT!'}` : lastTipo === 'doble' ? '✦ Doble' : '· Consuelo'}
              </span>
              <span className="text-amber-400 font-bold font-mono">+{lastWinXp} XP</span>
              <span className="text-cyan-400 font-bold font-mono">+{lastWinGemas} 💎</span>
            </div>
          )}
        </div>

        {/* Slots */}
        <div className="shrink-0 flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-tertiary)] ring-1 ring-amber-400/30 mx-auto md:mx-0">
          {reels.map((s, i) => {
            const Icon = ICON_MAP[s.icon] ?? IconDice;
            return (
              <div key={i} className={`w-14 h-16 rounded-lg bg-gradient-to-br from-slate-950 to-slate-900 ring-1 ring-amber-500/30 flex items-center justify-center ${spinning ? 'animate-slot-blur' : ''}`}>
                <Icon className={`w-8 h-8 ${s.color} drop-shadow-[0_0_6px_currentColor]`} strokeWidth={1.6} />
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleSpin}
          disabled={spinning || restantes === 0}
          className="shrink-0 w-full md:w-auto px-5 h-10 rounded-xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-rose-500 text-white text-[13px] font-black uppercase tracking-wider hover:brightness-110 active:scale-[0.97] shadow-lg shadow-fuchsia-500/30 ring-1 ring-amber-400/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {spinning ? 'Girando...' : restantes === 0 ? 'Vuelve el próximo finde' : '¡Tirar!'}
        </button>
      </div>
    </div>
  );
}
