'use client';

import { useState } from 'react';
import { Crown, Home, Lock, Users } from 'lucide-react';
import { ICON_MAP } from '../_lib/icons';
import type { ClienteTopEntry, Stats } from '../_lib/types';
import { KINGDOM_BUILDINGS, isBuildingUnlocked, type KingdomBuilding } from '../_lib/kingdom';
import { hashString } from '../_lib/utils';
import { SectionHeader } from './SectionHeader';

/* ============================================================
   Tab: Reino del Marketer — pueblo visual SVG
============================================================ */

export function TabReino({ stats, level, topClientes }: { stats: Stats; level: number; topClientes: ClienteTopEntry[] }) {
  const [selected, setSelected] = useState<KingdomBuilding | null>(null);
  const buildings = KINGDOM_BUILDINGS;
  const unlockedCount = buildings.filter((b) => isBuildingUnlocked(b, stats, level)).length;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Crown}
        iconColor="text-amber-400"
        title="Reino del Marketer"
        subtitle={`${unlockedCount} de ${buildings.length} edificios alzados — tu civilización crece`}
        right={`${Math.round((unlockedCount / buildings.length) * 100)}% del reino`}
      />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-950 via-violet-900/60 to-amber-900/40 border border-violet-500/20 shadow-2xl">
        <svg viewBox="0 0 1200 380" className="relative w-full h-auto block" style={{ minHeight: 280 }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            <radialGradient id="moon" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cielo */}
          <rect width="1200" height="280" fill="url(#skyGrad)" />

          {/* Estrellas */}
          {Array.from({ length: 30 }).map((_, i) => {
            const x = (hashString(`star-${i}`) % 1200);
            const y = ((hashString(`star-y-${i}`) % 240) + 10);
            const r = 0.6 + (hashString(`star-r-${i}`) % 100) / 100;
            return <circle key={`s-${i}`} cx={x} cy={y} r={r} fill="white" opacity={0.5 + (i % 3) * 0.15} className="constellation-twinkle" style={{ animationDelay: `${(i % 5) * 0.4}s` }} />;
          })}

          {/* Luna */}
          <circle cx={1050} cy={70} r={32} fill="url(#moon)" />
          <circle cx={1050} cy={70} r={22} fill="#fef3c7" opacity={0.95} />

          {/* Colinas de fondo */}
          <path d="M 0 240 Q 200 180 400 220 T 800 200 T 1200 230 L 1200 280 L 0 280 Z" fill="url(#hill1)" opacity="0.7" />
          <path d="M 0 260 Q 300 210 600 245 T 1200 250 L 1200 300 L 0 300 Z" fill="#064e3b" opacity="0.85" />

          {/* Tierra */}
          <rect x="0" y="280" width="1200" height="100" fill="url(#groundGrad)" />

          {/* Camino curveado */}
          <path d="M 0 350 Q 300 320 600 340 T 1200 330" fill="none" stroke="#92400e" strokeWidth="6" strokeOpacity="0.4" strokeDasharray="8 6" />

          {/* Nubes que flotan */}
          {[0, 1, 2].map((i) => (
            <g key={`cloud-${i}`} className={`animate-cloud-${i % 2}`} style={{ animationDelay: `${i * 4}s` }}>
              <ellipse cx={150 + i * 350} cy={70 + i * 20} rx={48} ry={14} fill="white" opacity="0.15" />
              <ellipse cx={160 + i * 350} cy={75 + i * 20} rx={32} ry={10} fill="white" opacity="0.12" />
            </g>
          ))}

        </svg>

        {/* Overlay de edificios con iconos Lucide */}
        <div className="absolute inset-0 pointer-events-none">
          {buildings.map((b) => {
            const unlocked = isBuildingUnlocked(b, stats, level);
            const Icon = ICON_MAP[b.icon] ?? Home;
            const isSelected = selected?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto kingdom-building"
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
              >
                <div className="relative">
                  {/* Halo bajo el edificio */}
                  {unlocked && <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-16 h-2 rounded-full bg-amber-400/30 blur-sm" />}
                  {/* Humo (chimenea) */}
                  {unlocked && b.hasChimney && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none">
                      <div className="relative w-6 h-12">
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1.5 h-1.5 rounded-full bg-white/40 animate-smoke-puff" />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1 h-1 rounded-full bg-white/30 animate-smoke-puff" style={{ animationDelay: '1.2s' }} />
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1.5 h-1.5 rounded-full bg-white/20 animate-smoke-puff" style={{ animationDelay: '2.4s' }} />
                      </div>
                    </div>
                  )}
                  {/* Marco principal */}
                  <div
                    className={`relative w-[64px] h-[64px] md:w-[72px] md:h-[72px] rounded-2xl flex items-center justify-center transition-all ${
                      unlocked
                        ? `bg-gradient-to-br ${b.color} ring-2 ${isSelected ? 'ring-amber-300' : 'ring-amber-400/40'} shadow-lg shadow-amber-500/15`
                        : 'bg-black/40 ring-1 ring-white/10 border border-dashed border-white/15'
                    }`}
                  >
                    {unlocked ? (
                      <Icon className={`w-9 h-9 md:w-10 md:h-10 ${b.iconColor} drop-shadow-lg`} strokeWidth={1.5} />
                    ) : (
                      <Lock className="w-5 h-5 text-white/40" />
                    )}
                    {/* Selección */}
                    {isSelected && (
                      <span className="absolute -inset-1 rounded-2xl ring-2 ring-amber-300 animate-pulse-slow pointer-events-none" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* === SALÓN DE CLIENTES === */}
      <section>
        <SectionHeader
          icon={Users}
          iconColor="text-amber-400"
          title="Salón de Clientes"
          subtitle={`Tus mejores socios del reino · €${(stats.ingresosTotal ?? 0).toLocaleString()} facturados en total`}
          right={`${stats.clientesUnicos ?? 0} clientes únicos`}
        />
        <div className="rounded-3xl bg-gradient-to-br from-amber-900/20 via-stone-900/40 to-zinc-900/40 border border-amber-500/20 p-5">
          {topClientes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-amber-400/40 mx-auto mb-2" />
              <p className="text-[13px] text-amber-100/60">Aún no tienes clientes en el salón.</p>
              <p className="text-[11.5px] text-amber-100/40 mt-1">Cierra tu primera propuesta para inaugurarlo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {topClientes.map((c, i) => {
                const initials = c.nombre.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';
                const palettes = [
                  'from-rose-500 to-orange-500',
                  'from-amber-400 to-yellow-500',
                  'from-emerald-500 to-cyan-500',
                  'from-blue-500 to-violet-500',
                  'from-fuchsia-500 to-rose-500',
                  'from-cyan-500 to-emerald-500',
                ];
                const palette = palettes[i % palettes.length];
                const rank = i + 1;
                return (
                  <div key={c.nombre + i} className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-amber-500/20 p-4 hover:border-amber-400/40 transition-colors">
                    {/* Rank badge */}
                    {rank <= 3 && (
                      <span className={`absolute top-2 right-2 inline-flex items-center px-1.5 h-[18px] rounded-md text-[9.5px] font-bold uppercase tracking-wider ${
                        rank === 1 ? 'bg-amber-500/20 ring-1 ring-amber-400/40 text-amber-300' :
                        rank === 2 ? 'bg-slate-400/20 ring-1 ring-slate-400/40 text-slate-300' :
                        'bg-orange-500/20 ring-1 ring-orange-500/40 text-orange-300'
                      }`}>
                        {rank === 1 ? '🥇 #1' : rank === 2 ? '🥈 #2' : '🥉 #3'}
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${palette} flex items-center justify-center shadow-lg`}>
                        <span className="text-white text-[15px] font-black">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-bold text-[var(--text-primary)] truncate">{c.nombre}</p>
                        {c.email && <p className="text-[10.5px] text-[var(--text-tertiary)] truncate font-mono">{c.email}</p>}
                        <p className="text-[18px] font-black text-amber-400 mt-1.5 leading-none">€{c.totalFacturado.toLocaleString()}</p>
                        <p className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">
                          {c.propuestasAceptadas} propuesta{c.propuestasAceptadas === 1 ? '' : 's'} aceptada{c.propuestasAceptadas === 1 ? '' : 's'}
                          {c.primeraAceptacion && ` · desde ${new Date(c.primeraAceptacion).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Panel del edificio seleccionado */}
      {selected ? (
        <div className={`relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${selected.color} ${isBuildingUnlocked(selected, stats, level) ? 'border-amber-400/40' : 'border-[var(--border-primary)] opacity-90'}`}>
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-16 h-16 rounded-2xl bg-black/30 ring-2 ring-amber-400/40 flex items-center justify-center">
              {(() => {
                const Icon = ICON_MAP[selected.icon] ?? Home;
                return <Icon className={`w-9 h-9 ${selected.iconColor}`} strokeWidth={1.5} />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-bold text-amber-100 leading-tight">{selected.nombre}</h3>
              <p className="text-[12px] text-amber-100/70 mt-0.5">{selected.desc}</p>
              {!isBuildingUnlocked(selected, stats, level) && (
                <p className="text-[11.5px] text-amber-300/90 mt-1.5 font-mono">
                  {selected.unlock.source === 'level' ? `Requiere Nivel ${selected.unlock.meta}` : `Progreso: ${stats[selected.unlock.source as string] ?? 0} / ${selected.unlock.meta}`}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-amber-200/70 hover:text-amber-100 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/20">×</button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] px-4 py-4 text-center">
          <p className="text-[12px] text-[var(--text-tertiary)]">Haz clic en un edificio del reino para verlo en detalle</p>
        </div>
      )}
    </div>
  );
}
