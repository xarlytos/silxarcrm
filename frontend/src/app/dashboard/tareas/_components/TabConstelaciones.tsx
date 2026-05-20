'use client';

import { useMemo, useState } from 'react';
import { Check, Lock, Shield, Star, Gem } from 'lucide-react';
import { CATEGORIA_INFO, ICON_MAP, RAREZA_INFO } from '../_lib/icons';
import type { Categoria, Rareza, TareaDef } from '../_lib/types';
import { SectionHeader } from './SectionHeader';

/* ============================================================
   Constellation Galaxy — mapa estelar de logros
============================================================ */

const CONSTELLATION_NAMES: Record<Categoria, string> = {
  comunicacion: 'El Mensajero',
  cazador: 'El Arquero',
  ventas: 'La Corona',
  marketing: 'El Cohete',
  productividad: 'El Reloj',
};

// Centros de cada constelación en el viewBox 1200x780
const CLUSTER_CENTERS: Record<Categoria, { cx: number; cy: number; radius: number; label: { x: number; y: number; align: 'start' | 'middle' | 'end' } }> = {
  comunicacion:  { cx: 600, cy: 130, radius: 180, label: { x: 600, y: 36, align: 'middle' } },
  cazador:       { cx: 240, cy: 360, radius: 130, label: { x: 240, y: 220, align: 'middle' } },
  ventas:        { cx: 960, cy: 360, radius: 130, label: { x: 960, y: 220, align: 'middle' } },
  marketing:     { cx: 320, cy: 640, radius: 130, label: { x: 320, y: 760, align: 'middle' } },
  productividad: { cx: 880, cy: 660, radius: 110, label: { x: 880, y: 770, align: 'middle' } },
};

function fibonacciStars(count: number, cx: number, cy: number, radius: number) {
  const out: { x: number; y: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const r = radius * Math.sqrt(t);
    const theta = i * golden;
    out.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
  }
  return out;
}

const RAREZA_STAR_SIZE: Record<Rareza, number> = {
  comun: 4,
  raro: 5.5,
  epico: 7,
  legendario: 9,
  mitico: 12,
};

const RAREZA_STAR_COLOR: Record<Rareza, string> = {
  comun: '#cbd5e1',
  raro: '#60a5fa',
  epico: '#a78bfa',
  legendario: '#fbbf24',
  mitico: '#f472b6',
};

export function TabConstelaciones({
  achievements, tareaProgress, isClaimed, onClaim,
}: {
  achievements: TareaDef[];
  tareaProgress: (t: TareaDef) => { value: number; pct: number; done: boolean };
  isClaimed: (t: TareaDef) => boolean;
  onClaim: (t: TareaDef, ev: React.MouseEvent) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<Categoria, TareaDef[]> = {
      comunicacion: [], cazador: [], ventas: [], marketing: [], productividad: [],
    };
    for (const a of achievements) {
      const cat = (a.categoria ?? 'productividad') as Categoria;
      map[cat].push(a);
    }
    return map;
  }, [achievements]);

  // Calcular posición de cada estrella
  const starPositions = useMemo(() => {
    const out: Record<string, { x: number; y: number; cat: Categoria }> = {};
    (Object.keys(grouped) as Categoria[]).forEach((cat) => {
      const list = grouped[cat];
      const center = CLUSTER_CENTERS[cat];
      const positions = fibonacciStars(list.length, center.cx, center.cy, center.radius);
      list.forEach((t, i) => { out[t.id] = { x: positions[i].x, y: positions[i].y, cat }; });
    });
    return out;
  }, [grouped]);

  const selected = selectedId ? achievements.find((a) => a.id === selectedId) ?? null : null;

  const total = achievements.length;
  const done = achievements.filter((a) => isClaimed(a)).length;

  // Estrellas decorativas de fondo (twinkle)
  const bgStars = useMemo(() => {
    const arr: { x: number; y: number; r: number; delay: number }[] = [];
    let seed = 42;
    for (let i = 0; i < 80; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const x = (seed / 233280) * 1200;
      seed = (seed * 9301 + 49297) % 233280;
      const y = (seed / 233280) * 780;
      seed = (seed * 9301 + 49297) % 233280;
      const r = 0.5 + (seed / 233280) * 1.2;
      seed = (seed * 9301 + 49297) % 233280;
      const delay = (seed / 233280) * 4;
      arr.push({ x, y, r, delay });
    }
    return arr;
  }, []);

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Star}
        iconColor="text-amber-400"
        title="Galaxia de Logros"
        subtitle={`${done} de ${total} estrellas desbloqueadas · 5 constelaciones por descubrir`}
        right={`${Math.round((done / Math.max(1, total)) * 100)}% del firmamento`}
      />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950/60 to-slate-950 border border-violet-500/20 shadow-2xl">
        {/* Halo decoraciones */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-amber-500/8 blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />

        <svg viewBox="0 0 1200 780" className="relative w-full h-auto block" style={{ minHeight: 500 }}>
          {/* SVG defs: filtros y gradientes */}
          <defs>
            <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="nebulaA" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebulaB" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Nebulosas decorativas en los clusters */}
          {(Object.keys(grouped) as Categoria[]).map((cat) => {
            const c = CLUSTER_CENTERS[cat];
            return <circle key={`neb-${cat}`} cx={c.cx} cy={c.cy} r={c.radius + 40} fill={`url(#nebula${cat === 'comunicacion' || cat === 'ventas' || cat === 'productividad' ? 'A' : 'B'})`} />;
          })}

          {/* Estrellas de fondo (twinkle) */}
          {bgStars.map((s, i) => (
            <circle
              key={`bg-${i}`}
              cx={s.x} cy={s.y} r={s.r}
              fill="#fff"
              className="constellation-twinkle"
              style={{ animationDelay: `${s.delay}s` }}
            />
          ))}

          {/* Constelaciones: nombres + líneas + estrellas */}
          {(Object.keys(grouped) as Categoria[]).map((cat) => {
            const list = grouped[cat];
            if (list.length === 0) return null;
            const center = CLUSTER_CENTERS[cat];
            const info = CATEGORIA_INFO[cat];

            return (
              <g key={cat}>
                {/* Label */}
                <text
                  x={center.label.x}
                  y={center.label.y}
                  textAnchor={center.label.align}
                  className="fill-slate-300 font-bold uppercase tracking-[0.2em]"
                  style={{ fontSize: 12 }}
                >
                  {CONSTELLATION_NAMES[cat]}
                </text>
                <text
                  x={center.label.x}
                  y={center.label.y + 16}
                  textAnchor={center.label.align}
                  className="fill-slate-500 uppercase tracking-wider"
                  style={{ fontSize: 9 }}
                >
                  {info.label}
                </text>

                {/* Líneas conectando estrellas (solo entre desbloqueadas o adyacentes) */}
                {list.slice(1).map((t, i) => {
                  const a = starPositions[list[i].id];
                  const b = starPositions[t.id];
                  if (!a || !b) return null;
                  const aDone = isClaimed(list[i]) || tareaProgress(list[i]).done;
                  const bDone = isClaimed(t) || tareaProgress(t).done;
                  const both = aDone && bDone;
                  return (
                    <line
                      key={`line-${cat}-${i}`}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={both ? '#fbbf24' : '#475569'}
                      strokeWidth={both ? 1.2 : 0.6}
                      strokeOpacity={both ? 0.65 : 0.25}
                      strokeDasharray={both ? undefined : '3 4'}
                    />
                  );
                })}

                {/* Estrellas */}
                {list.map((t) => {
                  const pos = starPositions[t.id];
                  if (!pos) return null;
                  const claimed = isClaimed(t);
                  const { pct, done } = tareaProgress(t);
                  const rareza = (t.rareza ?? 'comun') as Rareza;
                  const baseSize = RAREZA_STAR_SIZE[rareza];
                  const isSelected = selectedId === t.id;
                  let color = '#475569';
                  let opacity = 0.4;
                  let glow = false;
                  let ringSize = 0;
                  if (claimed) {
                    color = RAREZA_STAR_COLOR[rareza];
                    opacity = 1;
                    glow = true;
                    ringSize = baseSize + 6;
                  } else if (done) {
                    color = '#fbbf24';
                    opacity = 1;
                    glow = true;
                    ringSize = baseSize + 4;
                  } else if (pct > 0) {
                    color = '#94a3b8';
                    opacity = 0.7 + pct * 0.3;
                  }
                  return (
                    <g
                      key={t.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => setSelectedId(t.id)}
                      style={{ cursor: 'pointer' }}
                      className="constellation-star"
                    >
                      {/* Halo si está done o claimed */}
                      {ringSize > 0 && (
                        <circle r={ringSize} fill={color} opacity={0.15} className={done && !claimed ? 'constellation-pulse' : ''} />
                      )}
                      {/* Aro selección */}
                      {isSelected && (
                        <circle r={baseSize + 8} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.8} className="constellation-pulse" />
                      )}
                      {/* Estrella principal */}
                      <circle
                        r={baseSize}
                        fill={color}
                        opacity={opacity}
                        filter={glow ? 'url(#bigGlow)' : 'url(#starGlow)'}
                      />
                      {/* Rayos para legendarios/míticos desbloqueados */}
                      {claimed && (rareza === 'legendario' || rareza === 'mitico') && (
                        <g opacity={0.7}>
                          {[0, 45, 90, 135].map((angle) => (
                            <line
                              key={angle}
                              x1={-baseSize * 2.2 * Math.cos((angle * Math.PI) / 180)}
                              y1={-baseSize * 2.2 * Math.sin((angle * Math.PI) / 180)}
                              x2={baseSize * 2.2 * Math.cos((angle * Math.PI) / 180)}
                              y2={baseSize * 2.2 * Math.sin((angle * Math.PI) / 180)}
                              stroke={color}
                              strokeWidth={0.8}
                              strokeOpacity={0.6}
                            />
                          ))}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Panel de detalle de estrella seleccionada */}
      <SelectedStarPanel
        tarea={selected}
        progress={selected ? tareaProgress(selected) : null}
        claimed={selected ? isClaimed(selected) : false}
        onClaim={onClaim}
        onClose={() => setSelectedId(null)}
      />

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--text-tertiary)] px-1">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500/40 inline-block" /> Bloqueada</span>
        <span className="opacity-30">·</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> En progreso</span>
        <span className="opacity-30">·</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-pulse" /> Lista para reclamar</span>
        <span className="opacity-30">·</span>
        <span className="inline-flex items-center gap-1.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Conseguida</span>
        <span className="opacity-30 ml-auto">Haz clic en una estrella para verla en detalle</span>
      </div>
    </div>
  );
}

function SelectedStarPanel({
  tarea, progress, claimed, onClaim, onClose,
}: {
  tarea: TareaDef | null;
  progress: { value: number; pct: number; done: boolean } | null;
  claimed: boolean;
  onClaim: (t: TareaDef, ev: React.MouseEvent) => void;
  onClose: () => void;
}) {
  if (!tarea || !progress) {
    return (
      <div className="rounded-2xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] px-4 py-6 text-center">
        <Star className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
        <p className="text-[12.5px] text-[var(--text-tertiary)]">Selecciona una estrella del firmamento para ver sus detalles</p>
      </div>
    );
  }
  const Icon = ICON_MAP[tarea.icono] ?? Shield;
  const rarezaInfo = RAREZA_INFO[tarea.rareza ?? 'comun'];
  const isReady = progress.done && !claimed;
  return (
    <div
      data-card
      className={`relative overflow-hidden rounded-2xl border p-4 md:p-5 ${
        claimed
          ? 'bg-[var(--bg-secondary)] border-emerald-500/30'
          : isReady
          ? `bg-gradient-to-br ${rarezaInfo.bg} border-amber-500/40 ring-1 ring-amber-400/30 ${rarezaInfo.glow} shadow-lg`
          : `bg-[var(--bg-secondary)] ${rarezaInfo.border}`
      }`}
    >
      <div data-confetti className="absolute inset-0 pointer-events-none z-20" />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 w-7 h-7 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center justify-center text-[14px]"
      >×</button>

      <div className="flex items-start gap-4">
        <div className={`relative shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${rarezaInfo.bg} ring-2 ${rarezaInfo.ring}`}>
          {claimed ? <Check className="w-8 h-8 text-emerald-500" strokeWidth={3} /> : <Icon className={`w-8 h-8 ${rarezaInfo.text}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-1.5 h-[18px] rounded-md text-[9.5px] font-bold uppercase tracking-wider ring-1 ${rarezaInfo.ring} ${rarezaInfo.text}`}>
              {rarezaInfo.label}
            </span>
            {tarea.categoria && (
              <span className={`inline-flex items-center px-1.5 h-[18px] rounded-md text-[9.5px] font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] ${CATEGORIA_INFO[tarea.categoria].color}`}>
                {CATEGORIA_INFO[tarea.categoria].label}
              </span>
            )}
          </div>
          <h3 className="text-[18px] font-black text-[var(--text-primary)] mt-1 leading-tight">{tarea.titulo}</h3>
          <p className="text-[12.5px] text-[var(--text-tertiary)] mt-1 leading-snug">{tarea.descripcion}</p>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[12px] text-[var(--text-secondary)]">
                <span className={progress.done ? 'text-emerald-500 font-bold' : 'text-[var(--text-primary)] font-bold'}>{Math.min(progress.value, tarea.meta)}</span>
                <span className="text-[var(--text-tertiary)]"> / {tarea.meta}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-amber-500">
                  <Star className="w-3 h-3 fill-amber-500" />+{tarea.xp} XP
                </span>
                {tarea.gemas ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-cyan-500">
                    <Gem className="w-3 h-3 fill-cyan-500/40" />+{tarea.gemas}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-[width] duration-700 ${
                  progress.done ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                }`}
                style={{ width: `${Math.max(2, progress.pct * 100)}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-3">
            {claimed ? (
              <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-500">
                <Check className="w-3.5 h-3.5" strokeWidth={3} /> Conseguida
              </div>
            ) : isReady ? (
              <button
                type="button"
                onClick={(ev) => onClaim(tarea, ev)}
                className="h-10 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-white text-[13px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] shadow-lg shadow-amber-500/30"
              >
                ¡Reclamar +{tarea.xp} XP!
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                <Lock className="w-3.5 h-3.5" /> Continúa para desbloquearla
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
