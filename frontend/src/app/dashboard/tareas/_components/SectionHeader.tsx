'use client';

import type { LucideIcon } from 'lucide-react';

/* ============================================================
   Componentes auxiliares
============================================================ */

export function SectionHeader({ icon: Icon, iconColor, title, subtitle, right }: { icon: LucideIcon; iconColor: string; title: string; subtitle?: string; right?: string }) {
  return (
    <div className="flex items-end justify-between mb-3 px-1 gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <h2 className="text-[15px] font-bold uppercase tracking-wider text-[var(--text-primary)]">{title}</h2>
        </div>
        {subtitle && <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate">{subtitle}</p>}
      </div>
      {right && <span className="text-[10.5px] uppercase tracking-wider font-mono text-[var(--text-tertiary)] shrink-0">{right}</span>}
    </div>
  );
}

export function BigStatCard({ icon: Icon, label, value, color, bg }: { icon: LucideIcon; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bg} border border-[var(--border-primary)] p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[28px] font-black leading-none ${color}`}>{value}</p>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mt-1.5">{label}</p>
        </div>
        <Icon className={`w-7 h-7 ${color} opacity-60 shrink-0`} />
      </div>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      <p className="text-[19px] font-black font-mono text-[var(--text-primary)] leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)] mt-1.5">{label}</p>
    </div>
  );
}

export function SummaryRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold">{label}</p>
      <p className="text-[22px] font-black text-[var(--text-primary)] mt-1">
        {value.toLocaleString()} <span className="text-[12px] text-[var(--text-tertiary)] font-medium">{unit}</span>
      </p>
    </div>
  );
}

export function RatioCard({ label, value, num, den, color }: { label: string; value: number; num: number; den: number; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-4">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-tertiary)]">{label}</p>
      <p className="text-[32px] font-black text-[var(--text-primary)] mt-1 leading-tight">
        {value.toFixed(1)}<span className="text-[18px] text-[var(--text-tertiary)]">%</span>
      </p>
      <p className="text-[11px] font-mono text-[var(--text-tertiary)] mb-2">{num.toLocaleString()} / {den.toLocaleString()}</p>
      <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} transition-[width] duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
