'use client';

import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, CreditCard, Activity, Minus } from 'lucide-react';
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
}

function StatItem({ label, value, change, prefix = '', suffix = '', icon: Icon, iconBg, iconColor }: StatItemProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">{label}</p>
          <p className="text-[28px] font-bold text-[var(--text-primary)] tracking-tight">
            {prefix}{value}{suffix}
          </p>
          {change !== undefined && change !== null ? (
            <div className={`flex items-center gap-1 mt-2 ${change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {change >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="text-[13px] font-semibold">
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-[13px] text-[var(--text-tertiary)] ml-1">vs mes anterior</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-[var(--text-tertiary)]">
              <Minus className="w-4 h-4" />
              <span className="text-[13px]">Sin datos históricos</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${iconBg} dark:opacity-90 flex items-center justify-center`}>
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
      />
      <StatItem
        label="Clientes Activos"
        value={totalClients.toLocaleString()}
        change={hasData ? (changes.clientes ?? null) : null}
        icon={Users}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
      />
      <StatItem
        label="ARR Proyección Anual"
        value={formatCurrency(arr)}
        change={hasData ? (changes.arr ?? null) : null}
        icon={TrendingUp}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
      />
      <StatItem
        label="Suscripciones Activas"
        value={activeSubs.toLocaleString()}
        change={hasData ? null : null}
        icon={Activity}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
      />
      <StatItem
        label="Churn Rate"
        value={churnRate.toFixed(1)}
        suffix="%"
        change={hasData ? (changes.churn ?? null) : null}
        icon={ArrowDownRight}
        iconBg="bg-rose-100"
        iconColor="text-rose-600"
      />
      <StatItem
        label="Ingresos 30 días"
        value={formatCurrency(ingresos30d)}
        change={hasData ? (changes.ingresos ?? null) : null}
        icon={CreditCard}
        iconBg="bg-cyan-100"
        iconColor="text-cyan-600"
      />
    </div>
  );
}
