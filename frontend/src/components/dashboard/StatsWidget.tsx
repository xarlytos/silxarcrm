'use client';

import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, CreditCard, Activity, Minus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatCurrency } from '@/lib/utils';

interface StatItemProps {
  label: string;
  value: string | number;
  change?: number | null;
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent: string;
  delayClass?: string;
}

function StatItem({
  label,
  value,
  change,
  prefix = '',
  suffix = '',
  icon: Icon,
  iconBg,
  iconColor,
  accent,
  delayClass,
}: StatItemProps) {
  const positive = (change ?? 0) >= 0;

  return (
    <div
      style={{ '--accent': accent } as CSSProperties}
      className={`group relative overflow-hidden rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-5 dash-lift dash-rise ${delayClass ?? ''}`}
    >
      <span className="dash-stat-stripe" />
      <span className="dash-stat-blob" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)] mb-1.5">
            {label}
          </p>
          <p className="text-[30px] leading-[1.05] font-bold text-[var(--text-primary)] tracking-tight dash-tick">
            {prefix}{value}{suffix}
          </p>
          {change !== undefined && change !== null ? (
            <div
              className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                positive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {positive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{positive ? '+' : ''}{change.toFixed(1)}%</span>
              <span className="text-[11.5px] font-medium text-[var(--text-tertiary)] ml-1">
                vs mes anterior
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[12px] text-[var(--text-tertiary)]">
              <Minus className="w-3.5 h-3.5" />
              <span>Sin datos históricos</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06] transition-transform duration-300 ease-luxe group-hover:scale-[1.05] group-hover:-rotate-[3deg] ${iconBg} dark:opacity-95`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

interface StatsWidgetProps {
  mrr: number;
  arr: number;
  totalClients: number;
  activeSubs: number;
  churnRate: number;
  ingresos30d: number;
  // Opcional: cambios reales desde el backend
  changes?: {
    mrr?: number | null;
    clientes?: number | null;
    arr?: number | null;
    churn?: number | null;
    ingresos?: number | null;
  };
}

export default function StatsWidget({
  mrr,
  arr,
  totalClients,
  activeSubs,
  churnRate,
  ingresos30d,
  changes = {}
}: StatsWidgetProps) {
  // Si no hay datos (mrr = 0), no mostrar porcentajes falsos
  const hasData = mrr > 0 || totalClients > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <StatItem
        label="MRR (Ingresos Recurrentes)"
        value={formatCurrency(mrr)}
        change={hasData ? (changes.mrr ?? null) : null}
        icon={CreditCard}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
        accent="#10b981"
        delayClass="dash-rise-delay-1"
      />
      <StatItem
        label="Clientes Activos"
        value={totalClients.toLocaleString()}
        change={hasData ? (changes.clientes ?? null) : null}
        icon={Users}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        accent="#3b82f6"
        delayClass="dash-rise-delay-2"
      />
      <StatItem
        label="ARR Proyección Anual"
        value={formatCurrency(arr)}
        change={hasData ? (changes.arr ?? null) : null}
        icon={TrendingUp}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
        accent="#8b5cf6"
        delayClass="dash-rise-delay-3"
      />
      <StatItem
        label="Suscripciones Activas"
        value={activeSubs.toLocaleString()}
        change={hasData ? null : null}
        icon={Activity}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        accent="#f59e0b"
        delayClass="dash-rise-delay-4"
      />
      <StatItem
        label="Churn Rate"
        value={churnRate.toFixed(1)}
        suffix="%"
        change={hasData ? (changes.churn ?? null) : null}
        icon={ArrowDownRight}
        iconBg="bg-rose-100"
        iconColor="text-rose-600"
        accent="#f43f5e"
        delayClass="dash-rise-delay-5"
      />
      <StatItem
        label="Ingresos 30 días"
        value={formatCurrency(ingresos30d)}
        change={hasData ? (changes.ingresos ?? null) : null}
        icon={CreditCard}
        iconBg="bg-cyan-100"
        iconColor="text-cyan-600"
        accent="#06b6d4"
        delayClass="dash-rise-delay-6"
      />
    </div>
  );
}
